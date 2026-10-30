"""Render the EULA draft from the vault into eula.html and the TagoClip Pro installer screen.

Usage: python3 scripts/build-eula.py "<vault>/02 Projekte/TagoClip Pro EULA.md" eula.html ~/Documents/TagoClipPro-moonbase/installer/resources/license.html
The vault note is the source of truth, never edit the two outputs by hand."""
import html, re, sys, pathlib

src, web_tpl_out, inst_out = map(pathlib.Path, sys.argv[1:4])
text = src.read_text()
block = re.search(r"```\n(.*?)```", text, re.S).group(1)

# Join wrapped lines into paragraphs (blank line or a new numbered item starts one).
paras, cur = [], []
for line in block.splitlines():
    s = line.strip()
    starts = re.match(r"^(\d+\.\d+ |[a-g]\) |\d+\. [A-Z])", s)
    if not s or starts:
        if cur: paras.append(" ".join(cur)); cur = []
    if s: cur.append(s)
if cur: paras.append(" ".join(cur))

title, updated, *rest = paras
e = html.escape
body = []  # (kind, text)
for p in rest:
    if re.match(r"^\d+\. [A-Z]", p) and len(p) < 60:
        body.append(("h2", p))
    elif re.match(r"^[a-g]\) ", p):
        body.append(("li", p))
    else:
        body.append(("p", p))

def link(t):
    t = t.replace("info@tagobeats.com", '<a href="mailto:info@tagobeats.com">info@tagobeats.com</a>')
    t = t.replace("tagobeats.com/privacy", '<a href="https://tagobeats.com/privacy">tagobeats.com/privacy</a>')
    t = t.replace("the Imprint at tagobeats.com", 'the <a href="https://tagobeats.com/imprint">Imprint</a> at tagobeats.com')
    return t

def render(items, addr_br):
    out, in_list = [], False
    for kind, t in items:
        if kind == "li" and not in_list: out.append("  <ul>"); in_list = True
        if kind != "li" and in_list: out.append("  </ul>"); in_list = False
        t = link(e(t))
        if kind == "h2": out.append(f"  <h2>{t}</h2>")
        elif kind == "li": out.append(f"    <li>{t}</li>")
        else: out.append(f"  <p>{t}</p>")
    if in_list: out.append("  </ul>")
    s = "\n".join(out)
    # Contact block: one line per item.
    s = s.replace("<p>Robin Busse - Audio &amp; Media Germany Email: ", "<p>Robin Busse - Audio &amp; Media<br>Germany<br>Email: ")
    s = s.replace(" Further contact details:", "<br>Further contact details:")
    return s

content_web = render(body, True)
page = web_tpl_out.read_text() if web_tpl_out.exists() else None

web = f"""<!DOCTYPE html>
<html lang="en">
<head>
<title>TagoClip Pro EULA · TagoBeats</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="End User License Agreement for TagoClip Pro: licence scope, activations, trial, transfer, updates and liability.">
<link rel="canonical" href="https://tagobeats.com/eula">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="robots" content="noindex, follow">
<style>
@font-face {{ font-family:'Archivo'; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/archivo-3babba83.woff2") format('woff2'); }}
@font-face {{ font-family:'Archivo'; font-style:normal; font-weight:700; font-display:swap; src:url("fonts/archivo-3babba83.woff2") format('woff2'); }}
@font-face {{ font-family:'Space Mono'; font-style:normal; font-weight:400; font-display:swap; src:url("fonts/archivo-4bbe479d.woff2") format('woff2'); }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:#12100E; color:#ECE7DE; font-family:'Archivo',sans-serif; -webkit-font-smoothing:antialiased; }}
main {{ max-width:760px; margin:0 auto; padding:120px 24px 80px; }}
.kicker {{ font-family:'Space Mono',monospace; font-size:12px; letter-spacing:0.3em; color:#00FDDC; text-transform:uppercase; margin:0 0 16px; }}
h1 {{ margin:0 0 12px; font-size:clamp(30px,5vw,44px); font-weight:800; letter-spacing:-0.03em; color:#F2EEE6; }}
.updated {{ font-family:'Space Mono',monospace; font-size:12px; color:rgba(236,231,222,0.4); margin:0 0 32px; }}
h2 {{ margin:38px 0 12px; font-size:19px; font-weight:700; color:#F2EEE6; }}
p {{ margin:0 0 12px; font-size:15px; line-height:1.7; color:rgba(236,231,222,0.75); }}
li {{ margin:0 0 6px; font-size:15px; line-height:1.7; color:rgba(236,231,222,0.75); }}
ul {{ margin:0 0 12px; padding-left:0; list-style:none; }}
a {{ color:#00FDDC; text-decoration:none; overflow-wrap:anywhere; }}
.note {{ font-family:'Space Mono',monospace; font-size:12px; color:rgba(236,231,222,0.4); margin-top:36px; }}
nav {{ position:fixed; top:0; left:0; right:0; display:flex; align-items:center; justify-content:space-between; padding:24px; background:linear-gradient(180deg, rgba(18,16,14,0.9), transparent); }}
nav a {{ display:flex; align-items:center; gap:11px; color:#ECE7DE; }}
</style>
</head>
<body>
<nav>
  <a href="/"><span style="width:8px; height:8px; border-radius:50%; background:#00FDDC; display:block;"></span><span style="font-weight:700; font-size:15px; letter-spacing:0.18em;">TAGOBEATS</span></a>
  <a href="/tagoclip-pro" style="font-size:13px; letter-spacing:0.14em; font-weight:600; color:rgba(236,231,222,0.7);">TAGOCLIP PRO</a>
</nav>
<main>
  <p class="kicker">§ Legal</p>
  <h1>{e(title.replace(" End User License Agreement", ""))} End User License Agreement</h1>
  <p class="updated">{e(updated)}</p>

{content_web}

  <p class="note"><a href="/privacy">Privacy</a> · <a href="/imprint">Imprint</a></p>
</main>
</body>
</html>
"""
web_tpl_out.write_text(web)

inst = f"""<html>
<head><meta charset="utf-8"><style>
  body {{ font-family: -apple-system, Helvetica, sans-serif; font-size: 13px; color: #222; }}
  h2 {{ font-size: 15px; }}
  h3 {{ font-size: 13px; margin-top: 1.4em; }}
  ul {{ list-style: none; padding-left: 0; }}
  a {{ color: inherit; }}
</style></head>
<body>
  <h2>{e(title)}</h2>
  <p>{e(updated)}. Also available at tagobeats.com/eula.</p>

{render(body, False).replace("<h2>", "<h3>").replace("</h2>", "</h3>")}

  <h3>Third-party software</h3>
  <p>Built with the JUCE framework (juce.com). VST is a trademark of Steinberg
  Media Technologies GmbH. The full license texts are also installed inside
  each plugin bundle (Contents/Resources/THIRD_PARTY_LICENSES.txt).</p>
</body>
</html>
"""
# render() only knows h2; map the h3 marker back.
inst = inst.replace("  <p>" , "  <p>")
inst_out.write_text(inst)
print(len(body), "blocks")
