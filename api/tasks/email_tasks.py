"""
Transactional email tasks for WrightAI.

Emails are sent via Brevo (https://brevo.com).
Set BREVO_API_KEY and BREVO_FROM_EMAIL in your environment.

All send_* functions call Brevo synchronously (with a small inline retry).
Callers wrap them in try/except for fail-open behavior — quota alerts and
welcome emails are rare enough that the added latency is negligible.

Functions:
  send_email          — base send function, retried up to 2x
  send_quota_alert    — dedup-checked quota warning / exceeded email
  run_onboarding_drip — daily task for day-7 and day-14 nudges,
                        triggered via POST /internal/cron/onboarding-drip
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

_FROM_NAME = "Wright AI"
_FROM_EMAIL = os.getenv("BREVO_FROM_EMAIL", "hello@wrightai.live")


# ---------------------------------------------------------------------------
# Brevo client (lazy, fail-open) — SDK v4
# ---------------------------------------------------------------------------


def _brevo_client():
    """Return a configured brevo.Brevo client, or None if BREVO_API_KEY is not set."""
    api_key = os.getenv("BREVO_API_KEY", "")
    if not api_key:
        return None
    try:
        import brevo

        return brevo.Brevo(api_key=api_key)
    except ImportError:
        return None


# ---------------------------------------------------------------------------
# Base send task
# ---------------------------------------------------------------------------


def send_email(to: str, subject: str, html: str) -> bool:
    """Send a transactional email via Brevo, retrying once on failure."""
    client = _brevo_client()
    if not client:
        return False
    try:
        import brevo
    except ImportError:
        return False

    for attempt in range(2):
        try:
            client.transactional_emails.send_transac_email(
                sender=brevo.SendTransacEmailRequestSender(name=_FROM_NAME, email=_FROM_EMAIL),
                to=[brevo.SendTransacEmailRequestToItem(email=to)],
                subject=subject,
                html_content=html,
            )
            return True
        except Exception:
            if attempt == 0:
                time.sleep(1)
    return False


# ---------------------------------------------------------------------------
# HTML template helpers
# ---------------------------------------------------------------------------


_LOGO_URL = "https://www.wrightai.live/wright-logo.svg"
_SITE_URL = "https://www.wrightai.live"

# Fonts — web fonts load in Gmail web + Apple Mail; Georgia/Arial are the
# safe fallbacks that look great without them in all other clients.
_HF = "'Bricolage Grotesque', Georgia, 'Times New Roman', serif"
_BF = "'Poppins', Arial, Helvetica, sans-serif"
_MF = "'DM Mono', 'Courier New', Courier, monospace"

# Brand palette
_PURPLE = "#534AB7"
_PLT = "#7F77DD"  # purple-light
_DARK = "#06040F"
_DARK2 = "#0D0B1F"
_TEXT = "#F0EEF8"
_MUTED = "#8884A8"
_GREEN = "#1D9E75"
_AMBER = "#EF9F27"
_CYAN = "#00D4FF"
_BODY_TXT = "#333147"  # readable body text on white


def _wrap(body: str, preheader: str = "", hero_html: str = "") -> str:
    """
    WrightAI email shell, built on the Cerberus bulletproof-email foundation
    (https://www.cerberusemail.com/) — the same hybrid fluid/fixed pattern
    used in production by most major ESPs. Specifically:
      - MSO-conditional outer table forces an exact pixel width in Outlook
        desktop while every other client gets a fluid max-width div.
      - Outlook is force-fallen-back to a safe sans-serif so it never
        silently substitutes Times New Roman for an unrecognized webfont.
      - Preheader uses the two-part hidden-text + zero-width-joiner padding
        trick so email clients don't pull stray body text into the inbox
        preview line.
      - hero_html renders in its own zero-padding row — full-bleed with no
        negative margins or calc().
    """
    pre_html = ""
    if preheader:
        zwnj_pad = "&zwnj;&nbsp;" * 40
        pre_html = (
            f'<div style="max-height:0;overflow:hidden;mso-hide:all;" aria-hidden="true">{preheader}</div>'
            f'<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;'
            f'opacity:0;overflow:hidden;mso-hide:all;font-family:sans-serif;">{zwnj_pad}</div>'
        )

    hero_row = (
        (
            f'<tr><td colspan="3" bgcolor="{_DARK2}" style="background:{_DARK2};padding:0;">'
            f"{hero_html}</td></tr>"
        )
        if hero_html
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title></title>

<!--[if gte mso 9]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->

<!-- Outlook chokes on unrecognized webfont names and silently falls back to
     Times New Roman instead of the fallback stack — force a safe sans-serif. -->
<!--[if mso]>
<style>* {{ font-family: Arial, Helvetica, sans-serif !important; }}</style>
<![endif]-->

<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..60,400;12..60,600;12..60,700;12..60,800&family=Poppins:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" type="text/css">
<!--<![endif]-->

<style>
  :root {{ color-scheme: light; supported-color-schemes: light; }}
  html, body {{ margin:0 auto !important; padding:0 !important; height:100% !important; width:100% !important; }}
  * {{ -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }}
  div[style*="margin: 16px 0"] {{ margin:0 !important; }}
  #MessageViewBody, #MessageWebViewDiv {{ width:100% !important; }}
  table, td {{ mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }}
  table {{ border-spacing:0 !important; border-collapse:collapse !important; table-layout:fixed !important; margin:0 auto !important; }}
  img {{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }}
  a {{ text-decoration:none; }}
  a[x-apple-data-detectors], .unstyle-auto-detected-links a {{
    border-bottom:0 !important; cursor:default !important; color:inherit !important;
    text-decoration:none !important; font-size:inherit !important; font-family:inherit !important;
    font-weight:inherit !important; line-height:inherit !important;
  }}
  .a6S {{ display:none !important; opacity:0.01 !important; }}
  .im {{ color:inherit !important; }}
  @media only screen and (min-device-width:320px) and (max-device-width:374px) {{
    u ~ div .email-container {{ min-width:320px !important; }}
  }}
  @media only screen and (min-device-width:375px) and (max-device-width:413px) {{
    u ~ div .email-container {{ min-width:375px !important; }}
  }}
  @media only screen and (min-device-width:414px) {{
    u ~ div .email-container {{ min-width:414px !important; }}
  }}
  @media screen and (max-width:600px) {{
    .body-cell  {{ padding:28px 20px !important; }}
    .hero-cell  {{ padding:32px 20px 28px !important; }}
    .hero-h1    {{ font-size:22px !important; line-height:1.3 !important; }}
    .stack-col  {{ display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; margin-bottom:10px !important; }}
    .stack-gap  {{ display:none !important; line-height:0 !important; font-size:0 !important; max-height:0 !important; }}
    .footer-cell {{ padding:24px 20px !important; }}
    .footer-col  {{ display:block !important; width:100% !important; text-align:left !important; padding-right:0 !important; }}
    .footer-col + .footer-col {{ padding-top:16px !important; text-align:left !important; }}
  }}
</style>
</head>
<body width="100%" style="margin:0;padding:0 !important;mso-line-height-rule:exactly;background-color:{_DARK2};">
<center role="article" aria-roledescription="email" lang="en" style="width:100%;background-color:{_DARK2};">
<!--[if mso | IE]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:{_DARK2};"><tr><td>
<![endif]-->

{pre_html}

<div style="max-width:560px;margin:0 auto;" class="email-container">
<!--[if mso]>
<table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="560"><tr><td>
<![endif]-->

  <!-- Brand mark above card -->
  <table align="center" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr><td align="center" valign="middle" style="padding:36px 0 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td valign="middle" style="padding-right:10px;">
        <img src="{_LOGO_URL}" alt="Wright AI" width="30" height="30" style="width:30px;height:30px;">
      </td>
      <td valign="middle">
        <p style="margin:0 0 3px;font-family:{_HF};font-size:15px;font-weight:700;
                  color:{_TEXT};letter-spacing:-0.02em;line-height:1;">Wright AI</p>
        <p style="margin:0;font-family:{_MF};font-size:9px;color:{_PLT};
                  letter-spacing:0.12em;text-transform:uppercase;line-height:1;">Doc Intelligence</p>
      </td>
    </tr>
    </table>
  </td></tr>
  </table>

  <!-- Email card -->
  <table align="center" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         bgcolor="#ffffff" style="margin:0 auto;background:#ffffff;">

    <!-- Rainbow top bar: purple | cyan | green -->
    <tr>
      <td width="50%" height="4" bgcolor="{_PURPLE}"
          style="height:4px;padding:0;font-size:0;line-height:0;background:{_PURPLE};">&nbsp;</td>
      <td width="30%" height="4" bgcolor="{_CYAN}"
          style="height:4px;padding:0;font-size:0;line-height:0;background:{_CYAN};">&nbsp;</td>
      <td width="20%" height="4" bgcolor="{_GREEN}"
          style="height:4px;padding:0;font-size:0;line-height:0;background:{_GREEN};">&nbsp;</td>
    </tr>

    {hero_row}

    <!-- White content area -->
    <tr>
      <td colspan="3" class="body-cell" bgcolor="#ffffff"
          style="background:#ffffff;padding:40px 44px 40px;">
        {body}
      </td>
    </tr>

    <!-- Dark footer -->
    <tr>
      <td colspan="3" class="footer-cell" bgcolor="{_DARK}" style="background:{_DARK};padding:24px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="footer-col" valign="top" style="padding-right:20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right:8px;">
                <img src="{_LOGO_URL}" alt="" width="20" height="20"
                     style="width:20px;height:20px;opacity:0.6;">
              </td>
              <td valign="middle">
                <p style="margin:0;font-family:{_HF};font-size:13px;font-weight:700;
                          color:{_TEXT};letter-spacing:-0.02em;">Wright AI</p>
              </td>
            </tr>
            </table>
            <p style="margin:10px 0 0;font-family:{_BF};font-size:11px;
                      color:{_MUTED};line-height:1.6;">
              Documentation that never lies.
            </p>
          </td>
          <td class="footer-col" valign="top" align="right">
            <p style="margin:0 0 5px;">
              <a href="{_SITE_URL}/dashboard/settings?utm_source=email&utm_medium=transactional&utm_campaign=footer"
                 style="font-family:{_BF};font-size:11px;color:{_PLT};text-decoration:none;">
                Manage preferences</a>
            </p>
            <p style="margin:0 0 5px;">
              <a href="{_SITE_URL}/privacy-policy"
                 style="font-family:{_BF};font-size:11px;color:{_MUTED};text-decoration:none;">
                Privacy Policy</a>
            </p>
            <p style="margin:0;" class="unstyle-auto-detected-links">
              <a href="{_SITE_URL}"
                 style="font-family:{_MF};font-size:10px;color:{_MUTED};
                        letter-spacing:0.05em;text-decoration:none;">wrightai.live</a>
            </p>
          </td>
        </tr>
        </table>
      </td>
    </tr>

  </table><!-- /card -->

<!--[if mso]>
</td></tr></table>
<![endif]-->
</div>

<!--[if mso | IE]>
</td></tr></table>
<![endif]-->
</center>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Shared visual helpers — ALL table-based, no div layout, no negative margins,
# no calc(), no overflow:hidden on layout elements.
# ---------------------------------------------------------------------------


def _hero(title: str, subtitle: str = "", emoji: str = "") -> str:
    """
    Inner hero content. Pass as hero_html= to _wrap() so it lives in its own
    zero-padding table row — naturally full-bleed, zero CSS tricks needed.
    """
    emoji_row = (
        (
            f'<tr><td align="center" style="padding:0 0 14px;font-size:40px;line-height:1;">'
            f"{emoji}</td></tr>"
        )
        if emoji
        else ""
    )
    sub_row = (
        (
            f'<tr><td align="center" style="padding:10px 0 0;">'
            f'<p style="margin:0;font-family:{_BF};font-size:14px;'
            f'color:{_PLT};line-height:1.6;">{subtitle}</p></td></tr>'
        )
        if subtitle
        else ""
    )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td class="hero-cell" align="center" '
        f'style="padding:44px 40px 40px;text-align:center;">'
        # width="100%" is essential here — without it, table-layout:fixed has
        # no width to fix against and the table sizes to the H1's natural
        # (unwrapped) text width, overflowing narrow viewports.
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">'
        f"{emoji_row}"
        f'<tr><td align="center">'
        f'<h1 class="hero-h1" style="margin:0;font-family:{_HF};font-size:26px;'
        f"font-weight:800;color:{_TEXT};letter-spacing:-0.03em;line-height:1.25;"
        f'word-wrap:break-word;overflow-wrap:break-word;">'
        f"{title}</h1></td></tr>"
        f"{sub_row}"
        f"</table></td></tr></table>"
    )


def _stat_card(value: str, label: str, color: str = _PURPLE) -> str:
    """Large stat number in a tinted panel. Uses table, no div layout."""
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="32" style="height:32px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f'<tr><td bgcolor="#F4F2FF" style="background:#F4F2FF;'
        f'border-left:4px solid {color};padding:24px 28px;">'
        f'<p style="margin:0 0 6px;font-family:{_HF};font-size:52px;font-weight:800;'
        f'color:{color};letter-spacing:-0.05em;line-height:1;">{value}</p>'
        f'<p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};">{label}</p>'
        f"</td></tr>"
        f'<tr><td height="28" style="height:28px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f"</table>"
    )


def _divider(label: str = "") -> str:
    """Table-based divider — never a <div>."""
    if label:
        return (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td height="28" style="height:28px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
            f"<tr>"
            f'<td style="border-top:1px solid #E8E5F4;padding:0;width:30%;"></td>'
            f'<td align="center" style="padding:0 10px;white-space:nowrap;">'
            f'<span style="font-family:{_MF};font-size:9px;color:#C5C1DC;'
            f'letter-spacing:0.14em;text-transform:uppercase;">{label}</span></td>'
            f'<td style="border-top:1px solid #E8E5F4;padding:0;width:30%;"></td>'
            f"</tr>"
            f'<tr><td colspan="3" height="24" style="height:24px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
            f"</table>"
        )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        '<tr><td style="height:28px;border-top:1px solid #E8E5F4;'
        'padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        '<tr><td height="24" style="height:24px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        "</table>"
    )


def _cta_block(label: str, url: str, note: str = "") -> str:
    """
    Bulletproof CTA button — the Cerberus/Litmus pattern: VML roundrect for
    Outlook desktop, and for every other client a <td class="button-td"> with
    the background + border-radius, wrapping an <a> with display:block (not
    inline-block — Outlook's Word engine ignores padding on inline-block
    anchors) that repeats padding/radius/background for full coverage.
    """
    note_html = (
        (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td align="center" style="padding:10px 0 0;">'
            f'<p style="margin:0;font-family:{_BF};font-size:12px;color:{_MUTED};">{note}</p>'
            f"</td></tr></table>"
        )
        if note
        else ""
    )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="12" style="height:12px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f'<tr><td align="center">'
        f"<!--[if mso]>"
        f'<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" '
        f'href="{url}" style="height:50px;v-text-anchor:middle;width:300px;" '
        f'arcsize="18%" stroke="f" fillcolor="{_PURPLE}">'
        f"<w:anchorlock/>"
        f'<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">{label}</center>'
        f"</v:roundrect>"
        f"<![endif]-->"
        f"<!--[if !mso]><!-->"
        f'<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">'
        f'<tr><td class="button-td" bgcolor="{_PURPLE}" style="border-radius:8px;background:{_PURPLE};">'
        f'<a href="{url}" target="_blank" '
        f'style="display:block;padding:15px 44px;background:{_PURPLE};color:#ffffff;'
        f"font-family:{_BF};font-size:15px;font-weight:700;letter-spacing:-0.01em;"
        f'text-decoration:none;border-radius:8px;border:1px solid {_PURPLE};">{label}</a>'
        f"</td></tr>"
        f"</table>"
        f"<!--<![endif]-->"
        f"</td></tr>"
        f'<tr><td height="8" style="height:8px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f"</table>"
        f"{note_html}"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="20" style="height:20px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f"</table>"
    )


def _check_row(text: str, available: bool = True, soon: bool = False) -> str:
    """Feature row with checkmark. Border on <td>, not <tr> (Outlook safe)."""
    if soon:
        icon_style = f"width:24px;padding:11px 0;font-family:{_MF};font-size:13px;color:#5A5490;vertical-align:top;"
        icon_char = "&#x2713;"
        text_style = f"padding:11px 0;font-family:{_BF};font-size:14px;color:{_MUTED};font-style:italic;border-bottom:1px solid #F0EEF8;vertical-align:top;"
    elif available:
        icon_style = f"width:24px;padding:11px 0;font-family:{_MF};font-size:14px;color:{_GREEN};font-weight:700;vertical-align:top;"
        icon_char = "&#x2713;"
        text_style = f"padding:11px 0;font-family:{_BF};font-size:14px;color:#111020;font-weight:600;border-bottom:1px solid #F0EEF8;vertical-align:top;"
    else:
        icon_style = f"width:24px;padding:11px 0;font-family:{_MF};font-size:14px;color:#D0CCEA;vertical-align:top;"
        icon_char = "&#x2717;"
        text_style = f"padding:11px 0;font-family:{_BF};font-size:14px;color:{_MUTED};border-bottom:1px solid #F0EEF8;vertical-align:top;"
    return (
        f"<tr>"
        f'<td style="{icon_style}border-bottom:1px solid #F0EEF8;">{icon_char}</td>'
        f'<td style="{text_style}">{text}</td>'
        f"</tr>"
    )


def _dark_callout(title: str, body_text: str) -> str:
    """Dark branded callout block."""
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="24" style="height:24px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f'<tr><td bgcolor="{_DARK2}" style="background:{_DARK2};border-left:4px solid {_PURPLE};'
        f'padding:20px 24px;">'
        f'<p style="margin:0 0 6px;font-family:{_MF};font-size:9px;color:{_PLT};'
        f'letter-spacing:0.12em;text-transform:uppercase;">{title}</p>'
        f'<p style="margin:0;font-family:{_HF};font-size:15px;font-weight:600;'
        f'color:{_TEXT};line-height:1.65;">{body_text}</p>'
        f"</td></tr>"
        f'<tr><td height="28" style="height:28px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
        f"</table>"
    )


def _founder_sig(ps: str = "") -> str:
    """Founder signature. Uses a square badge in Outlook (no border-radius support there)."""
    ps_html = (
        (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td style="border-top:1px solid #E8E5F4;padding:18px 0 0;">'
            f'<p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.7;">'
            f"<em>P.S. {ps}</em></p></td></tr></table>"
        )
        if ps
        else ""
    )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f"<tr>"
        f'<td width="44" valign="top" style="width:44px;padding-right:14px;padding-top:2px;">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td width="40" height="40" bgcolor="{_PURPLE}" align="center" valign="middle"'
        f' style="width:40px;height:40px;background:{_PURPLE};text-align:center;vertical-align:middle;'
        f'font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#ffffff;">S</td></tr>'
        f"</table>"
        f"</td>"
        f'<td valign="top">'
        f'<p style="margin:0 0 2px;font-family:{_HF};font-size:16px;font-weight:700;color:#111020;">Suraj</p>'
        f'<p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};">Founder, WrightAI</p>'
        f"</td>"
        f"</tr>"
        f"</table>"
        f"{ps_html}"
    )


def _p(text: str, mb: int = 18) -> str:
    return (
        f'<p style="margin:0 0 {mb}px;font-family:{_BF};font-size:15px;'
        f'color:{_BODY_TXT};line-height:1.8;">{text}</p>'
    )


def _bar(pct: int, color: str = _AMBER) -> str:
    """Table-based progress bar — works in Outlook (no overflow:hidden, no border-radius)."""
    filled = max(1, min(pct, 100))
    empty = 100 - filled
    empty_td = (
        (
            f'<td width="{empty}%" bgcolor="#EDE9F8" '
            f'style="background:#EDE9F8;height:10px;font-size:0;line-height:0;padding:0;">&nbsp;</td>'
        )
        if empty > 0
        else ""
    )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f"<tr>"
        f'<td width="{filled}%" height="10" bgcolor="{color}" '
        f'style="background:{color};height:10px;font-size:0;line-height:0;padding:0;">&nbsp;</td>'
        f"{empty_td}"
        f"</tr>"
        f"</table>"
    )


# ---------------------------------------------------------------------------
# Email composers
# ---------------------------------------------------------------------------


def send_welcome(to: str, first_name: str = "") -> None:
    """Send the welcome / onboarding email immediately after sign-up."""
    name = first_name.strip() or "there"

    def _step(n: str, title: str, desc: str, last: bool = False) -> str:
        # Returns a <tr> — caller must use bare <table>...</table> wrapper, no <tr><td> in between
        border_td = "" if last else "border-bottom:1px solid #F0EEF8;"
        return (
            f"<tr>"
            f'<td width="36" valign="top" style="{border_td}padding:16px 10px 16px 0;vertical-align:top;width:36px;">'
            # Number badge as a table cell (no div — Outlook safe)
            f'<table role="presentation" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td width="30" height="30" bgcolor="{_PURPLE}" align="center" valign="middle"'
            f' style="width:30px;height:30px;background:{_PURPLE};text-align:center;'
            f"vertical-align:middle;font-family:Georgia,serif;font-size:13px;"
            f'font-weight:bold;color:#ffffff;">{n}</td></tr>'
            f"</table>"
            f"</td>"
            f'<td valign="top" style="{border_td}padding:16px 0;vertical-align:top;">'
            f'<p style="margin:0 0 3px;font-family:{_HF};font-size:15px;font-weight:700;color:#111020;">{title}</p>'
            f'<p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.65;">{desc}</p>'
            f"</td>"
            f"</tr>"
        )

    def _feature_card(em: str, title: str, desc: str) -> str:
        # Standalone table per card — no nesting issues
        return (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td bgcolor="#F4F2FF" style="background:#F4F2FF;border-left:4px solid {_PURPLE};padding:14px 16px;">'
            f'<p style="margin:0 0 4px;font-family:{_HF};font-size:14px;font-weight:700;color:#111020;">{em} {title}</p>'
            f'<p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.6;">{desc}</p>'
            f"</td></tr>"
            f"</table>"
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td height="10" style="height:10px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>'
            f"</table>"
        )

    hero = _hero("Welcome to WrightAI 👋", f"Hi {name}, your first docstring is 2 minutes away.")
    body = (
        _p("You're not just installing another AI documentation tool.")
        + f'<p style="margin:0 0 0;font-family:{_HF};font-size:17px;font-weight:700;'
        f'color:#111020;line-height:1.5;letter-spacing:-0.02em;">'
        f"You're using the first platform designed to keep documentation "
        f"<em>accurate</em> as your code evolves.</p>"
        + _divider("Get started in 2 minutes")
        # Steps table — <tr>s directly inside <table>, no extra <tr><td> wrapper
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        + _step(
            "1",
            "Install the VS Code Extension",
            "Search <strong>WrightAI</strong> in the Extensions Marketplace.",
        )
        + _step(
            "2",
            "Add Your API Key",
            "Sign in to WrightAI and paste your API key into the extension.",
        )
        + _step(
            "3",
            "Generate Your First Doc",
            "Open any file. Click <strong>Generate Docs</strong> above a function. That's it.",
            last=True,
        )
        + "</table>"
        + _cta_block(
            "Open Your Dashboard →",
            f"{_SITE_URL}/dashboard?utm_source=email&utm_medium=transactional&utm_campaign=welcome&utm_content=dashboard_cta",
        )
        + _divider("Your Free plan includes")
        # Matches /pricing exactly — no credit card required.
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">'
        + _check_row("500 doc generations / month")
        + _check_row("200 drift detections / month — structural &amp; semantic, both included")
        + _check_row("300 codebase chat messages / month")
        + _check_row("Unlimited automated coverage scans")
        + _check_row("1 connected repository &middot; 1 API key")
        + _check_row("VS Code extension, CLI &amp; MCP server (self-hosted, always free)")
        + "</table>"
        + f'<p style="margin:10px 0 28px;font-family:{_BF};font-size:12px;color:#9590b0;">No credit card required. Need more room? WrightAI Pro triples every limit.</p>'
        + _divider("What to explore next")
        + _feature_card(
            "📊", "Documentation Coverage", "See exactly how well documented your repo really is."
        )
        + _feature_card(
            "🔍", "Drift Detection", "Find docs that are no longer accurate after code changes."
        )
        + _feature_card(
            "💬", "Codebase Chat", "Ask questions with trusted, indexed context from your code."
        )
        + _dark_callout(
            "Remember",
            "Documentation isn't valuable because it <em>exists</em>.<br>It's valuable because developers and AI agents can <strong>trust it</strong>.",
        )
        + _founder_sig(
            "Just reply to this email if you need help. Every message goes directly to me."
        )
    )
    send_email(
        to,
        "Welcome to WrightAI — your trusted documentation intelligence platform",
        _wrap(
            body, preheader=f"Hi {name} — your first docstring is 2 minutes away.", hero_html=hero
        ),
    )


def send_quota_warning(to: str, used: int, limit: int, pct: int, first_name: str = "") -> None:
    """Send the 80% quota warning email."""
    name = first_name.strip() or "there"
    # Pro-exclusive features only — matches /pricing exactly, nothing invented or unconfirmed.
    features = [
        ("3× the monthly limits — 1,500 docs · 1,000 drift checks · 1,000 chat messages", False),
        ("Auto-PR for drift fixes", False),
        ("GitHub Action PR comments", False),
        ("5 connected repositories · 5 API keys", False),
        ("Enhanced dashboard with drift history &amp; trends", False),
        ("Prioritized support", False),
    ]
    feature_rows = "".join(_check_row(f, soon=soon) for f, soon in features)
    hero = _hero(f"You've used {pct}% of your quota ⚡", f"You're making great progress, {name}.")
    body = (
        _stat_card(f"{pct}%", "of monthly WrightAI generations used", color=_AMBER)
        + f'<p style="margin:0 0 6px;font-family:{_MF};font-size:10px;color:#9590b0;letter-spacing:0.08em;text-transform:uppercase;">Monthly usage</p>'
        + _bar(pct, _AMBER)
        + f'<p style="margin:4px 0 32px;font-family:{_BF};font-size:12px;color:#9590b0;text-align:right;">{used} of {limit} used</p>'
        + _divider("Unlock Pro")
        + _p("With WrightAI Pro you get:", mb=16)
        + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">{feature_rows}</table>'
        + _divider()
        + _p('Upgrade to WrightAI Pro for <strong style="color:#111020;">$18/month</strong>', mb=12)
        + _cta_block(
            "Upgrade to Pro →",
            f"{_SITE_URL}/pricing?utm_source=email&utm_medium=transactional&utm_campaign=quota_warning&utm_content=upgrade_cta",
            note="No long-term commitment · Cancel any time",
        )
        + f'<p style="margin:0;font-family:{_BF};font-size:15px;color:#6b6890;">Thanks for building with WrightAI.</p>'
    )
    send_email(
        to,
        f"You've used {pct}% of your WrightAI quota this month",
        _wrap(
            body,
            preheader=f"You've used {pct}% of your monthly generations — here's what Pro unlocks.",
            hero_html=hero,
        ),
    )


def send_quota_exceeded(to: str, first_name: str = "") -> None:
    """Send the hard-limit hit email."""
    name = first_name.strip() or "there"
    hero = _hero(
        "You've reached your monthly limit", f"Hi {name} — don't worry, here's what to do.", "🛑"
    )
    body = (
        _p(
            "Your existing documentation, dashboard and reports remain <strong>fully available</strong>.",
            mb=28,
        )
        + _divider("Option 1 — Upgrade")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:16px;">
  <tr>
    <td bgcolor="#F4F2FF" style="background:#F4F2FF;border-radius:14px;
               border:2px solid {_PURPLE};padding:24px 28px;">
      <p style="margin:0 0 4px;font-family:{_MF};font-size:10px;font-weight:500;
                color:{_PURPLE};letter-spacing:0.12em;text-transform:uppercase;">
        Recommended
      </p>
      <p style="margin:0 0 10px;font-family:{_HF};font-size:20px;font-weight:800;
                color:#111020;letter-spacing:-0.02em;">Upgrade to WrightAI Pro</p>
      <p style="margin:0 0 20px;font-family:{_BF};font-size:14px;color:#4a4868;
                line-height:1.75;">
        Continue immediately with 3× the monthly limits, auto-PR for drift fixes,
        GitHub Action PR comments, and 5 repositories instead of 1.
      </p>
      {_cta_block("Upgrade Now →", f"{_SITE_URL}/pricing?utm_source=email&utm_medium=transactional&utm_campaign=quota_exceeded&utm_content=upgrade_cta")}
    </td>
  </tr>
</table>"""
        + _divider("Option 2 — CLI")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:28px;">
  <tr>
    <td bgcolor="#F8F7FE" style="background:#F8F7FE;border-radius:14px;
               border:1px solid #EDEBF8;padding:24px 28px;">
      <p style="margin:0 0 10px;font-family:{_HF};font-size:20px;font-weight:800;
                color:#111020;letter-spacing:-0.02em;">Continue Using the CLI</p>
      <p style="margin:0 0 10px;font-family:{_BF};font-size:14px;color:#4a4868;
                line-height:1.75;">
        Keep your workflow running with your own Anthropic API key — no quota limits.
      </p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:#6b6890;">
        Set <code style="font-family:{_MF};background:#EDEBF8;padding:2px 8px;
        border-radius:4px;font-size:12px;">ANTHROPIC_API_KEY</code> and the CLI runs without interruption.
      </p>
    </td>
  </tr>
</table>"""
        + _dark_callout(
            "The next generation of software",
            "It needs documentation that stays accurate as code evolves.<br>That's what we're building with WrightAI.",
        )
        + _founder_sig("Questions? Simply reply — every message comes directly to me.")
    )
    send_email(
        to,
        "You've reached your WrightAI monthly limit",
        _wrap(
            body,
            preheader="You've hit your limit — upgrade now or keep going with the CLI.",
            hero_html=hero,
        ),
    )


def send_day7_nudge(to: str, first_name: str = "") -> None:
    """Day-7 onboarding nudge for active free users."""
    name = first_name.strip() or "there"

    # Matches /pricing exactly — both plans share structural + semantic drift
    # detection and chat; Pro's real differentiators are quotas, repos, and
    # these binary features. Nothing invented or unconfirmed.
    cmp_rows = [
        ("AI Documentation Generation", True, True),
        ("Structural + Semantic Drift Detection", True, True),
        ("Codebase Chat", True, True),
        ("Coverage Dashboard", True, True),
        ("Auto-PR for Drift Fixes", False, True),
        ("GitHub Action PR Comments", False, True),
        ("Enhanced Dashboard (Drift History &amp; Trends)", False, True),
    ]

    def _cmp_check(val: bool, pro: bool = False) -> str:
        if val:
            c = _PURPLE if pro else _GREEN
            return f'<span style="font-family:{_MF};font-size:15px;color:{c};font-weight:700;">&#x2713;</span>'
        return f'<span style="font-family:{_MF};font-size:14px;color:#D0CCEA;">&#x2717;</span>'

    cmp_table = "".join(
        f'<tr style="background:{"#F8F7FE" if i%2==1 else "#fff"};">'
        f'<td style="padding:11px 14px;font-family:{_BF};font-size:13px;color:#4a4868;'
        f'{"border-top:1px solid #EDEBF8;" if i>0 else ""}">{feat}</td>'
        f'<td style="text-align:center;width:58px;{"border-top:1px solid #EDEBF8;" if i>0 else ""}">{_cmp_check(free_v)}</td>'
        f'<td style="text-align:center;width:58px;{"border-top:1px solid #EDEBF8;" if i>0 else ""}">{_cmp_check(pro_v,True)}</td>'
        f'</tr>'
        for i, (feat, free_v, pro_v) in enumerate(cmp_rows)
    )

    hero = _hero(
        f"You're in the top 20% of WrightAI users in week one, {name}. 👏",
        "One week in — and you're already ahead of most.",
    )
    body = (
        # ── Three pillar cards (31% each, 3.5% gaps = 100%) ─────────────────
        f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td width="31%" class="stack-col" valign="top" bgcolor="#F4F2FF"
        style="background:#F4F2FF;border-top:3px solid {_PURPLE};
               padding:20px 16px;text-align:center;vertical-align:top;">
      <p style="margin:0 0 10px;font-size:26px;line-height:1;font-family:Arial,sans-serif;">📝</p>
      <p style="margin:0 0 6px;font-family:{_HF};font-size:14px;font-weight:700;color:#111020;line-height:1.3;">Generate</p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.55;">AI-powered docs in seconds</p>
    </td>
    <td width="3.5%" class="stack-gap" style="font-size:0;line-height:0;">&nbsp;</td>
    <td width="31%" class="stack-col" valign="top" bgcolor="#F0FBF7"
        style="background:#F0FBF7;border-top:3px solid {_GREEN};
               padding:20px 16px;text-align:center;vertical-align:top;">
      <p style="margin:0 0 10px;font-size:26px;line-height:1;font-family:Arial,sans-serif;">🔍</p>
      <p style="margin:0 0 6px;font-family:{_HF};font-size:14px;font-weight:700;color:#111020;line-height:1.3;">Verify</p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.55;">Detect drift continuously</p>
    </td>
    <td width="3.5%" class="stack-gap" style="font-size:0;line-height:0;">&nbsp;</td>
    <td width="31%" class="stack-col" valign="top" bgcolor="#F0F8FF"
        style="background:#F0F8FF;border-top:3px solid {_CYAN};
               padding:20px 16px;text-align:center;vertical-align:top;">
      <p style="margin:0 0 10px;font-size:26px;line-height:1;font-family:Arial,sans-serif;">✅</p>
      <p style="margin:0 0 6px;font-family:{_HF};font-size:14px;font-weight:700;color:#111020;line-height:1.3;">Trust</p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.55;">Docs that stay accurate</p>
    </td>
  </tr>
</table>"""
        # ── The real insight (dark pull-quote) ───────────────────────────────
        + _divider("The insight most developers miss")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td bgcolor="{_DARK2}" style="background:{_DARK2};padding:28px 32px;">
      <p style="margin:0 0 12px;font-family:{_MF};font-size:10px;color:{_MUTED};
                letter-spacing:0.14em;text-transform:uppercase;">The real problem</p>
      <p style="margin:0;font-family:{_HF};font-size:20px;font-weight:800;color:{_TEXT};
                line-height:1.45;letter-spacing:-0.02em;">
        It's not that documentation is missing.<br>
        <span style="color:{_PLT};">It's that it can no longer be trusted.</span>
      </p>
    </td>
  </tr>
</table>"""
        # ── AI urgency card ──────────────────────────────────────────────────
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td bgcolor="#F4F2FF" style="background:#F4F2FF;border-left:4px solid {_PURPLE};padding:20px 24px;">
      <p style="margin:0 0 16px;font-family:{_MF};font-size:10px;color:{_PURPLE};
                letter-spacing:0.14em;text-transform:uppercase;">Why this matters more than ever</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="36" valign="top"
              style="padding:10px 14px 10px 0;font-size:20px;line-height:1;
                     border-bottom:1px solid #E0DCF4;font-family:Arial,sans-serif;">🤖</td>
          <td valign="top"
              style="padding:10px 0;font-family:{_BF};font-size:14px;color:#111020;
                     line-height:1.65;font-weight:600;border-bottom:1px solid #E0DCF4;">
            AI agents now write code, open PRs, and refactor your codebase.
          </td>
        </tr>
        <tr>
          <td width="36" valign="top"
              style="padding:10px 14px 10px 0;font-size:20px;line-height:1;
                     border-bottom:1px solid #E0DCF4;font-family:Arial,sans-serif;">📖</td>
          <td valign="top"
              style="padding:10px 0;font-family:{_BF};font-size:14px;color:#4a4868;
                     line-height:1.65;border-bottom:1px solid #E0DCF4;">
            They read your documentation as context to make decisions.
          </td>
        </tr>
        <tr>
          <td width="36" valign="top"
              style="padding:10px 14px 0 0;font-size:20px;line-height:1;font-family:Arial,sans-serif;">⚠️</td>
          <td valign="top"
              style="padding:10px 0 0;font-family:{_BF};font-size:14px;color:#4a4868;line-height:1.65;">
            Stale docs don't just mislead humans —
            <strong style="color:#111020;">they mislead the AI working alongside you.</strong>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
        # ── Generation ≠ Reliability (two comparison cards) ──────────────────
        + _divider("Generation ≠ Reliability")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td width="48%" class="stack-col" valign="top" bgcolor="#F8F7FE"
        style="background:#F8F7FE;border:1px solid #DDDAF0;padding:20px 20px;vertical-align:top;">
      <p style="margin:0 0 12px;font-size:24px;line-height:1;font-family:Arial,sans-serif;">⚡</p>
      <p style="margin:0 0 6px;font-family:{_MF};font-size:10px;color:{_MUTED};
                letter-spacing:0.12em;text-transform:uppercase;">Other tools</p>
      <p style="margin:0 0 8px;font-family:{_HF};font-size:15px;font-weight:700;color:#6b6890;line-height:1.3;">
        Generate once
      </p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.65;">
        Docs created once, then left to drift as code moves on.
      </p>
    </td>
    <td width="4%" class="stack-gap" style="font-size:0;line-height:0;">&nbsp;</td>
    <td width="48%" class="stack-col" valign="top" bgcolor="#F4F2FF"
        style="background:#F4F2FF;border:2px solid {_PURPLE};padding:20px 20px;vertical-align:top;">
      <p style="margin:0 0 12px;font-size:24px;line-height:1;font-family:Arial,sans-serif;">🔄</p>
      <p style="margin:0 0 6px;font-family:{_MF};font-size:10px;color:{_PURPLE};
                letter-spacing:0.12em;text-transform:uppercase;">WrightAI</p>
      <p style="margin:0 0 8px;font-family:{_HF};font-size:15px;font-weight:700;color:#111020;line-height:1.3;">
        Continuously verified
      </p>
      <p style="margin:0;font-family:{_BF};font-size:13px;color:#4a4868;line-height:1.65;">
        Every doc monitored against live code, every single day.
      </p>
    </td>
  </tr>
</table>"""
        # ── Drift reality (dark card, consistent borders on both cells) ───────
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td bgcolor="{_DARK2}" style="background:{_DARK2};padding:24px 28px;">
      <p style="margin:0 0 18px;font-family:{_MF};font-size:10px;color:{_MUTED};
                letter-spacing:0.14em;text-transform:uppercase;">What drift looks like</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="36" valign="middle"
              style="padding:12px 14px 12px 0;font-size:18px;line-height:1;
                     border-bottom:1px solid #1E1B38;font-family:Arial,sans-serif;">📄</td>
          <td valign="middle"
              style="padding:12px 0;font-family:{_BF};font-size:14px;color:{_TEXT};
                     line-height:1.6;border-bottom:1px solid #1E1B38;">
            README says A. Code does B.
          </td>
        </tr>
        <tr>
          <td width="36" valign="middle"
              style="padding:12px 14px 12px 0;font-size:18px;line-height:1;
                     border-bottom:1px solid #1E1B38;font-family:Arial,sans-serif;">🔌</td>
          <td valign="middle"
              style="padding:12px 0;font-family:{_BF};font-size:14px;color:{_TEXT};
                     line-height:1.6;border-bottom:1px solid #1E1B38;">
            API docs say X. Endpoint returns Y.
          </td>
        </tr>
        <tr>
          <td width="36" valign="middle"
              style="padding:12px 14px 12px 0;font-size:18px;line-height:1;
                     border-bottom:1px solid #1E1B38;font-family:Arial,sans-serif;">🏗️</td>
          <td valign="middle"
              style="padding:12px 0;font-family:{_BF};font-size:14px;color:{_TEXT};
                     line-height:1.6;border-bottom:1px solid #1E1B38;">
            Architecture docs no longer reflect reality.
          </td>
        </tr>
        <tr>
          <td width="36" valign="middle"
              style="padding:12px 14px 0 0;font-size:18px;line-height:1;font-family:Arial,sans-serif;">🤖</td>
          <td valign="middle"
              style="padding:12px 0 0;font-family:{_BF};font-size:14px;color:{_AMBER};
                     font-weight:600;line-height:1.6;">
            AI agents act on outdated context.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
        # ── What WrightAI uniquely does ──────────────────────────────────────
        + _dark_callout(
            "What only WrightAI does",
            "Continuously monitors your docs against live code — catching drift "
            "structurally <em>and</em> semantically — before it misleads your team "
            f'or the AI tools working alongside you. <strong style="color:{_PLT};">No other tool does this.</strong>',
        )
        # ── Free vs Pro comparison table ─────────────────────────────────────
        + _divider("Free vs Pro")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="border:1px solid #DDDAF0;margin-bottom:16px;">
  <tr bgcolor="#F8F7FE" style="background:#F8F7FE;">
    <th style="padding:12px 16px;font-family:{_MF};font-size:10px;color:{_MUTED};
               text-align:left;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;
               border-bottom:1px solid #DDDAF0;">Feature</th>
    <th style="padding:12px 16px;font-family:{_MF};font-size:10px;color:{_MUTED};
               text-align:center;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;
               width:56px;border-bottom:1px solid #DDDAF0;">Free</th>
    <th style="padding:12px 16px;font-family:{_MF};font-size:10px;color:{_PURPLE};
               text-align:center;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;
               width:56px;border-bottom:1px solid #DDDAF0;">Pro</th>
  </tr>
  {cmp_table}
</table>"""
        + f'<p style="margin:0 0 28px;font-family:{_BF};font-size:13px;color:{_MUTED};line-height:1.65;">'
        f"Pro triples every limit — 1,500 docs · 1,000 drift checks · 1,000 chat messages — "
        f"and raises repos &amp; API keys from 1 to 5.</p>"
        + _cta_block(
            "Explore WrightAI Pro →",
            f"{_SITE_URL}/pricing?utm_source=email&utm_medium=drip&utm_campaign=onboarding_day7&utm_content=upgrade_cta",
            note="No long-term commitment · Cancel any time",
        )
        + _founder_sig("What's one feature you'd love to see? Just reply — I read every response.")
    )
    send_email(
        to,
        "You're in the top 20% of WrightAI users. Here's what most developers discover next.",
        _wrap(
            body,
            preheader=f"One week in and you're already ahead, {name}. Here's the challenge most developers miss.",
            hero_html=hero,
        ),
    )


def send_day14_nudge(to: str, first_name: str = "") -> None:
    """Day-14 onboarding nudge — personal founder note + direct upgrade pitch."""
    name = first_name.strip() or "there"

    # Matches /pricing exactly — Pro-exclusive features only, nothing invented.
    pro_features = [
        "3× the monthly limits — 1,500 docs · 1,000 drift checks · 1,000 chat messages",
        "Auto-PR for drift fixes",
        "GitHub Action PR comments",
        "5 connected repositories &amp; API keys (up from 1)",
        "Enhanced dashboard with drift history &amp; trends",
        "Prioritized support",
    ]
    feature_rows = "".join(_check_row(f) for f in pro_features)

    hero = _hero("Two weeks with WrightAI", f"A personal note from the founder, {name}.", "✉️")
    body = (
        _p(
            "Two weeks ago you started using WrightAI. I wanted to write to you directly — "
            "not about features or pricing, but about where I think software is going.",
            mb=28,
        )
        # ── The shift (dark statement card) ──────────────────────────────────
        + _divider("The shift I'm watching")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td bgcolor="{_DARK2}" style="background:{_DARK2};padding:28px 32px;">
      <p style="margin:0 0 12px;font-family:{_MF};font-size:10px;color:{_MUTED};
                letter-spacing:0.14em;text-transform:uppercase;">The new reality</p>
      <p style="margin:0 0 24px;font-family:{_HF};font-size:21px;font-weight:800;
                color:{_TEXT};line-height:1.35;letter-spacing:-0.025em;">
        Software is no longer written<br>only by humans.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" valign="top" style="padding-right:16px;border-right:1px solid #1E1B38;">
            <p style="margin:0 0 6px;font-family:{_MF};font-size:10px;color:#6B6890;
                      letter-spacing:0.12em;text-transform:uppercase;">Old bottleneck</p>
            <p style="margin:0;font-family:{_BF};font-size:14px;color:{_MUTED};
                      text-decoration:line-through;line-height:1.55;">Writing code</p>
          </td>
          <td width="4%" style="font-size:0;">&nbsp;</td>
          <td width="48%" valign="top" style="padding-left:16px;">
            <p style="margin:0 0 6px;font-family:{_MF};font-size:10px;color:{_PLT};
                      letter-spacing:0.12em;text-transform:uppercase;">New bottleneck</p>
            <p style="margin:0;font-family:{_BF};font-size:14px;font-weight:700;
                      color:{_TEXT};line-height:1.55;">Maintaining trusted knowledge</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
        # ── Market evolution (clean 2-col table, no overflow) ─────────────────
        + _divider("Where the industry is heading")
        + _p("Every major infrastructure shift in software has followed the same arc:", mb=16)
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="border:1px solid #DDDAF0;margin-bottom:32px;">
  <tr bgcolor="#F8F7FE" style="background:#F8F7FE;">
    <th style="padding:11px 16px;font-family:{_MF};font-size:10px;color:{_MUTED};
               text-align:left;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;
               border-bottom:1px solid #DDDAF0;">Era</th>
    <th style="padding:11px 16px;font-family:{_MF};font-size:10px;color:{_MUTED};
               text-align:left;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;
               border-bottom:1px solid #DDDAF0;">The layer that defined it</th>
  </tr>
  <tr>
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:{_MUTED};
               border-bottom:1px solid #F0EEF8;">
      <span style="font-family:Arial,sans-serif;">🗂️</span>&nbsp; Source Control
    </td>
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:#6b6890;
               border-bottom:1px solid #F0EEF8;">Git</td>
  </tr>
  <tr bgcolor="#FAFAFE" style="background:#FAFAFE;">
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:{_MUTED};
               border-bottom:1px solid #F0EEF8;">
      <span style="font-family:Arial,sans-serif;">🤝</span>&nbsp; Collaboration
    </td>
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:#6b6890;
               border-bottom:1px solid #F0EEF8;">GitHub</td>
  </tr>
  <tr>
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:{_MUTED};
               border-bottom:1px solid #F0EEF8;">
      <span style="font-family:Arial,sans-serif;">⚡</span>&nbsp; Code Generation
    </td>
    <td style="padding:13px 16px;font-family:{_BF};font-size:14px;color:#6b6890;
               border-bottom:1px solid #F0EEF8;">Copilot · Cursor · Claude Code</td>
  </tr>
  <tr bgcolor="#F4F2FF" style="background:#F4F2FF;">
    <td style="padding:14px 16px;font-family:{_BF};font-size:14px;font-weight:700;color:#111020;">
      <span style="font-family:Arial,sans-serif;">🛡️</span>&nbsp; Knowledge Reliability
    </td>
    <td style="padding:14px 16px;font-family:{_HF};font-size:14px;font-weight:700;color:{_PURPLE};">
      WrightAI
    </td>
  </tr>
</table>"""
        # ── Trust problem (dark callout) ──────────────────────────────────────
        + _dark_callout(
            "The problem no one else is solving",
            f"Cursor, Copilot, and Mintlify are great at <em>creating</em> documentation. "
            f"But creation is a one-time event.<br><br>"
            f"When AI agents depend on your docs for context every day — "
            f'<strong style="color:{_PLT};">you need a layer that continuously verifies '
            f"what's still true.</strong> That's WrightAI.",
        )
        # ── Vision card ───────────────────────────────────────────────────────
        + _divider("What we're building toward")
        + f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:32px;">
  <tr>
    <td bgcolor="#F4F2FF" style="background:#F4F2FF;border-left:4px solid {_PURPLE};padding:24px 28px;">
      <p style="margin:0 0 12px;font-family:{_MF};font-size:10px;color:{_PURPLE};
                letter-spacing:0.14em;text-transform:uppercase;">The category we're creating</p>
      <p style="margin:0 0 20px;font-family:{_HF};font-size:19px;font-weight:800;color:#111020;
                line-height:1.4;letter-spacing:-0.02em;">
        The system of record for engineering knowledge —
        <span style="color:{_PURPLE};">trusted by humans and AI agents alike.</span>
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="32" valign="middle"
              style="padding:10px 14px 10px 0;font-size:16px;line-height:1;
                     border-bottom:1px solid #E0DCF4;font-family:Arial,sans-serif;">📁</td>
          <td valign="middle"
              style="padding:10px 0;font-family:{_BF};font-size:14px;color:#4a4868;
                     line-height:1.6;border-bottom:1px solid #E0DCF4;">
            Every repo. Every function. Every architectural decision.
          </td>
        </tr>
        <tr>
          <td width="32" valign="middle"
              style="padding:10px 14px 10px 0;font-size:16px;line-height:1;
                     border-bottom:1px solid #E0DCF4;font-family:Arial,sans-serif;">🔄</td>
          <td valign="middle"
              style="padding:10px 0;font-family:{_BF};font-size:14px;color:#4a4868;
                     line-height:1.6;border-bottom:1px solid #E0DCF4;">
            Continuously verified as your code evolves.
          </td>
        </tr>
        <tr>
          <td width="32" valign="middle"
              style="padding:10px 14px 0 0;font-size:16px;line-height:1;font-family:Arial,sans-serif;">✅</td>
          <td valign="middle"
              style="padding:10px 0 0;font-family:{_BF};font-size:14px;font-weight:700;color:#111020;line-height:1.6;">
            Always accurate. Always trustworthy.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
        # ── Pro pitch ─────────────────────────────────────────────────────────
        + _divider("WrightAI Pro unlocks")
        + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">{feature_rows}</table>'
        + _p('Annual pricing starts at <strong style="color:#111020;">$14/month</strong>.', mb=20)
        + _cta_block(
            "Upgrade to WrightAI Pro →",
            f"{_SITE_URL}/pricing?utm_source=email&utm_medium=drip&utm_campaign=onboarding_day14&utm_content=upgrade_cta",
            note="No long-term commitment · Cancel any time",
        )
        + _p(
            "Whether you upgrade or not — you're part of a small group of developers "
            "who saw this problem early. That matters to me.",
            mb=0,
        )
        + _founder_sig(
            "Just reply and tell me: what's the #1 thing that would make WrightAI indispensable for you?"
        )
    )
    send_email(
        to,
        "Two weeks with WrightAI. A quick note from the founder.",
        _wrap(
            body,
            preheader="A personal note on where software is going — and why knowledge reliability is the next big layer.",
            hero_html=hero,
        ),
    )


# ---------------------------------------------------------------------------
# Dedup-checked quota alert
# ---------------------------------------------------------------------------


def send_quota_alert(api_key: str, pct: int, used: int, limit: int) -> None:
    """
    Send a quota warning (≥80%) or exceeded (≥100%) email if one hasn't
    already been sent this calendar month. Dedup is tracked in the users
    table via quota_warning_sent_month / quota_exceeded_sent_month columns.
    """
    if not api_key or not api_key.startswith("wai_"):
        return

    try:
        from api.user_store import _db

        db = _db()
        month_key = datetime.now(tz=timezone.utc).strftime("%Y-%m")

        row_result = (
            db.table("users")
            .select("email, first_name, quota_warning_sent_month, quota_exceeded_sent_month")
            .eq("api_key", api_key)
            .execute()
        )
        if not row_result.data:
            return

        user = row_result.data[0]
        email: str = user.get("email", "")
        if not email:
            return
        first_name: str = user.get("first_name") or ""

        if pct >= 100:
            if user.get("quota_exceeded_sent_month") != month_key:
                send_quota_exceeded(email, first_name=first_name)
                db.table("users").update({"quota_exceeded_sent_month": month_key}).eq(
                    "api_key", api_key
                ).execute()
        elif pct >= 80:
            if user.get("quota_warning_sent_month") != month_key:
                send_quota_warning(email, used, limit, pct, first_name=first_name)
                db.table("users").update({"quota_warning_sent_month": month_key}).eq(
                    "api_key", api_key
                ).execute()
    except Exception:
        pass  # Fail-open: never break a quota check because of email issues


# ---------------------------------------------------------------------------
# Daily onboarding drip (triggered via Cloud Scheduler -> internal cron route)
# ---------------------------------------------------------------------------


def run_onboarding_drip() -> dict:
    """
    Daily task: find free-plan users at exactly day 7 or day 14 who have
    generated at least a few docstrings but haven't converted, then send
    the appropriate nudge email.

    Triggered daily via POST /internal/cron/onboarding-drip (Cloud Scheduler).
    """
    try:
        from api.user_store import _db

        db = _db()
        now = datetime.now(tz=timezone.utc)
        sent7 = 0
        sent14 = 0

        for days, col, min_docs, send_fn in [
            (7, "onboarding_day7_sent", 3, send_day7_nudge),
            (14, "onboarding_day14_sent", 5, send_day14_nudge),
        ]:
            cutoff = (now - timedelta(days=days)).date().isoformat()
            result = (
                db.table("users")
                .select("api_key, email, first_name")
                .eq("plan", "free")
                .eq(col, False)
                .gte("created_at", f"{cutoff}T00:00:00Z")
                .lt("created_at", f"{cutoff}T23:59:59Z")
                .execute()
            )

            for u in result.data or []:
                docs = _count_all_docs(db, u["api_key"])
                if docs >= min_docs:
                    send_fn(u["email"], first_name=u.get("first_name") or "")
                    db.table("users").update({col: True}).eq("api_key", u["api_key"]).execute()
                    if days == 7:
                        sent7 += 1
                    else:
                        sent14 += 1

        return {"day7_sent": sent7, "day14_sent": sent14, "ok": True}
    except Exception as exc:
        return {"error": str(exc), "ok": False}


def _count_all_docs(db, api_key: str) -> int:
    """Count total lifetime doc generations for a user (all months)."""
    try:
        id_result = db.table("users").select("id").eq("api_key", api_key).execute()
        if not id_result.data:
            return 0
        user_id = id_result.data[0]["id"]
        count_result = (
            db.table("usage_events")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("event_type", "docs_generated")
            .execute()
        )
        return count_result.count or 0
    except Exception:
        return 0
