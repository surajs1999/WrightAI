from __future__ import annotations

import hashlib
from dataclasses import dataclass

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction, ParsedClass


@dataclass
class CodeChunk:
    chunk_id: str
    file_path: str
    language: str
    chunk_type: str
    name: str
    source: str
    start_line: int
    end_line: int
    token_count: int


class ASTChunker:
    MAX_CHUNK_TOKENS = 1500
    MIN_CHUNK_TOKENS = 100

    def chunk_file(self, parsed_file: ParsedFile) -> list[CodeChunk]:
        chunks: list[CodeChunk] = []

        for func in parsed_file.functions:
            chunk = self._func_to_chunk(func, parsed_file.language)
            if chunk:
                chunks.append(chunk)

        for cls in parsed_file.classes:
            cls_chunk = self._class_to_chunk(cls, parsed_file.language)
            if cls_chunk:
                chunks.append(cls_chunk)
            for method in cls.methods:
                m_chunk = self._func_to_chunk(method, parsed_file.language)
                if m_chunk:
                    chunks.append(m_chunk)

        chunks = self._merge_small_chunks(chunks)
        return chunks

    def _func_to_chunk(self, func: ParsedFunction, language: str) -> CodeChunk | None:
        token_count = len(func.source) // 4
        if token_count > self.MAX_CHUNK_TOKENS:
            # Truncate to max tokens worth of chars
            truncated = func.source[: self.MAX_CHUNK_TOKENS * 4]
            token_count = self.MAX_CHUNK_TOKENS
        else:
            truncated = func.source

        chunk_id = hashlib.sha256(func.source.encode()).hexdigest()
        return CodeChunk(
            chunk_id=chunk_id,
            file_path=func.file_path,
            language=language,
            chunk_type="function",
            name=func.name,
            source=truncated,
            start_line=func.start_line,
            end_line=func.end_line,
            token_count=token_count,
        )

    def _class_to_chunk(self, cls: ParsedClass, language: str) -> CodeChunk | None:
        token_count = len(cls.source) // 4
        if token_count > self.MAX_CHUNK_TOKENS:
            truncated = cls.source[: self.MAX_CHUNK_TOKENS * 4]
            token_count = self.MAX_CHUNK_TOKENS
        else:
            truncated = cls.source

        chunk_id = hashlib.sha256(cls.source.encode()).hexdigest()
        return CodeChunk(
            chunk_id=chunk_id,
            file_path=cls.file_path,
            language=language,
            chunk_type="class",
            name=cls.name,
            source=truncated,
            start_line=cls.start_line,
            end_line=cls.end_line,
            token_count=token_count,
        )

    def _merge_small_chunks(self, chunks: list[CodeChunk]) -> list[CodeChunk]:
        if not chunks:
            return []

        result: list[CodeChunk] = []
        i = 0
        while i < len(chunks):
            chunk = chunks[i]
            if chunk.token_count < self.MIN_CHUNK_TOKENS and i + 1 < len(chunks):
                next_chunk = chunks[i + 1]
                merged_tokens = chunk.token_count + next_chunk.token_count
                if merged_tokens <= self.MAX_CHUNK_TOKENS:
                    merged_source = chunk.source + "\n\n" + next_chunk.source
                    merged_id = hashlib.sha256(merged_source.encode()).hexdigest()
                    merged = CodeChunk(
                        chunk_id=merged_id,
                        file_path=chunk.file_path,
                        language=chunk.language,
                        chunk_type="module",
                        name=f"{chunk.name}+{next_chunk.name}",
                        source=merged_source,
                        start_line=chunk.start_line,
                        end_line=next_chunk.end_line,
                        token_count=merged_tokens,
                    )
                    result.append(merged)
                    i += 2
                    continue
            result.append(chunk)
            i += 1
        return result

    def chunk_directory(self, parsed_files: list[ParsedFile]) -> list[CodeChunk]:
        all_chunks: list[CodeChunk] = []
        for pf in parsed_files:
            all_chunks.extend(self.chunk_file(pf))
        return all_chunks
