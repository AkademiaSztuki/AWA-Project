-- Link glossary terms in the typeset node list.
-- Skips letters inside words, existing links, and nodes marked ida.nolink_attr.
-- Does not change the source files.

ida = ida or {}

local GLYPH = node.id("glyph")
local GLUE = node.id("glue")
local KERN = node.id("kern")
local PENALTY = node.id("penalty")
local DISC = node.id("disc")
local HLIST = node.id("hlist")
local VLIST = node.id("vlist")
local WHATSIT = node.id("whatsit")
local START_LINK = node.subtype("pdf_start_link")
local END_LINK = node.subtype("pdf_end_link")
local DONE = luatexbase.new_attribute("idadone")

local ACCENT = "0.24707 0.35294 0.45097 rg 0.24707 0.35294 0.45097 RG"

local function parts_of(s)
  local parts = {}
  local buf = ""
  local function flush()
    if buf ~= "" then
      parts[#parts + 1] = {kind = "word", s = buf}
      buf = ""
    end
  end
  for i = 1, #s do
    local c = s:sub(i, i)
    if c == " " then
      flush()
      parts[#parts + 1] = {kind = "space"}
    elseif c == "-" then
      flush()
      parts[#parts + 1] = {kind = "hyphen"}
    else
      buf = buf .. c
    end
  end
  flush()
  return parts
end

local function T(text, target)
  return {text = text, target = target, parts = parts_of(text)}
end

-- Longest forms first so "Vertex AI" wins over "AI", "SAM2" over "SAM".
local terms = {
  T("IPIP-NEO-120", "IPIP-NEO-120"),
  T("ControlNet", "ControlNet"),
  T("Vertex AI", "VertexAI"),
  T("Big Five", "BigFive"),
  T("ComfyUI", "ComfyUI"),
  T("SAM2", "SAM"),
  T("FLUX", "FLUX"),
  T("XAI", "XAI"),
  T("RtD", "RtD"),
  T("PRS", "PRS"),
  T("VLM", "VLM"),
  T("LLM", "LLM"),
  T("IDA", "IDA"),
  T("IAT", "IAT"),
  T("HCI", "HCI"),
  T("GCP", "GCP"),
  T("SAM", "SAM"),
  T("RQ", "RQ"),
  T("AI", "AI"),
}

local function is_letter(cp)
  if not cp then return false end
  if (cp >= 65 and cp <= 90) or (cp >= 97 and cp <= 122) then return true end
  if cp >= 192 and cp <= 687 and cp ~= 215 and cp ~= 247 then return true end
  return false
end

local function is_digit(cp)
  return cp and cp >= 48 and cp <= 57
end

local function is_hyphen(cp)
  return cp == 45 or cp == 173 or cp == 8208 or cp == 8211
end

-- A soft hyphenation point has an empty replace list.
-- An explicit hyphen (IPIP-NEO-120) is a disc whose replace holds the hyphen.
local function disc_is_hyphen(n)
  if not n or n.id ~= DISC then return false end
  local h = n.replace
  while h do
    if h.id == GLYPH and is_hyphen(h.char) then return true end
    h = h.next
  end
  return false
end

local function skip_soft(n)
  while n and (n.id == KERN or n.id == PENALTY or (n.id == DISC and not disc_is_hyphen(n))) do
    n = n.next
  end
  return n
end

local function prev_glyph(n)
  local p = n.prev
  while p and (p.id == KERN or p.id == PENALTY or (p.id == DISC and not disc_is_hyphen(p))) do
    p = p.prev
  end
  return p
end

local function suppressed(n)
  local a = ida.nolink_attr
  if not a then return false end
  local v = node.has_attribute(n, a)
  return v ~= nil and v > 0
end

local function boundary_char(n)
  if not n or n.id ~= GLYPH then return nil end
  return n.char
end

local function try_term(start, term)
  if suppressed(start) then return nil end
  local prev = prev_glyph(start)
  local pc = boundary_char(prev)
  if is_letter(pc) or is_digit(pc) then return nil end
  local n = start
  local last = start
  for _, part in ipairs(term.parts) do
    n = skip_soft(n)
    if not n then return nil end
    if part.kind == "word" then
      for i = 1, #part.s do
        if i > 1 then
          n = skip_soft(n)
        end
        if not n or n.id ~= GLYPH or n.char ~= part.s:byte(i) or suppressed(n) then
          return nil
        end
        last = n
        n = n.next
      end
    elseif part.kind == "space" then
      if n.id ~= GLUE then return nil end
      last = n
      n = n.next
    elseif part.kind == "hyphen" then
      local ok = (n.id == GLYPH and is_hyphen(n.char) and not suppressed(n))
        or disc_is_hyphen(n)
      if not ok then return nil end
      last = n
      n = n.next
    end
  end
  local nxt = skip_soft(n)
  local nc = boundary_char(nxt)
  if is_letter(nc) or is_digit(nc) then return nil end
  return last
end

local function page_label()
  local n = tex.count["c@page"] or 0
  if n < 1 then return "0" end
  local mode = 0
  if tex.count["ida@pagemode"] then
    mode = tex.count["ida@pagemode"]
  end
  if mode == 0 then
    local vals = {
      {1000, "m"}, {900, "cm"}, {500, "d"}, {400, "cd"},
      {100, "c"}, {90, "xc"}, {50, "l"}, {40, "xl"},
      {10, "x"}, {9, "ix"}, {5, "v"}, {4, "iv"}, {1, "i"},
    }
    local s, x = "", n
    for _, v in ipairs(vals) do
      while x >= v[1] do
        s = s .. v[2]
        x = x - v[1]
      end
    end
    if s == "" then s = "0" end
    return s
  end
  return tostring(n)
end

local function color_push()
  local w = node.new("whatsit", "pdf_colorstack")
  w.stack = 0
  w.command = 1
  w.data = ACCENT
  return w
end

local function color_pop()
  local w = node.new("whatsit", "pdf_colorstack")
  w.stack = 0
  w.command = 2
  w.data = ""
  return w
end

local function make_dest(name)
  local d = node.new("whatsit", "pdf_dest")
  d.named_id = 1
  d.dest_id = name
  d.dest_type = 0
  d.xyz_zoom = 0
  return d
end

local function make_start(name)
  local a = node.new("whatsit", "pdf_action")
  a.action_type = 1
  a.named_id = 1
  a.action_id = name
  local s = node.new("whatsit", "pdf_start_link")
  s.action = a
  s.link_attr = "/Border [0 0 0]"
  return s
end

local use_id = 0

-- The automatic link box collapses to a 2pt sliver in this font pipeline.
-- Measure the matched glyphs and set the annotation explicitly.
local function span_box(first, last)
  local w, h, d = 0, 0, 0
  local g = first
  while g do
    if g.width and (g.id == GLYPH or g.id == GLUE or g.id == KERN
        or g.id == DISC or g.id == HLIST or g.id == VLIST) then
      w = w + g.width
    end
    if g.height and g.height > h then h = g.height end
    if g.depth and g.depth > d then d = g.depth end
    if g == last then break end
    g = g.next
  end
  if h == 0 then h = tex.sp("7.5pt") end
  return w, h, d
end

local function wrap(head, first, last, target)
  use_id = use_id + 1
  local id = use_id
  local dest = make_dest("ida.use." .. id)
  local start = make_start("ida.term." .. target)
  local sw, sh, sd = span_box(first, last)
  start.width = sw
  start.height = sh
  start.depth = sd
  local stop = node.new("whatsit", "pdf_end_link")
  head = node.insert_before(head, first, dest)
  if not ida.print_mode then
    head = node.insert_before(head, first, color_push())
  end
  head = node.insert_before(head, first, start)
  local after = last.next
  head = node.insert_after(head, last, stop)
  if not ida.print_mode then
    head = node.insert_after(head, stop, color_pop())
  end
  local g = first
  while g do
    if g.id == GLYPH then
      node.set_attribute(g, DONE, 1)
    end
    if g == last then break end
    g = g.next
  end
  ida.uses[#ida.uses + 1] = {
    target = target,
    id = id,
    page = page_label(),
  }
  return head, after
end

local function process_list(head, link_depth)
  if not head then return head end
  link_depth = link_depth or 0
  local n = head
  while n do
    if n.id == WHATSIT and n.subtype == START_LINK then
      link_depth = link_depth + 1
      n = n.next
    elseif n.id == WHATSIT and n.subtype == END_LINK then
      if link_depth > 0 then link_depth = link_depth - 1 end
      n = n.next
    elseif n.id == HLIST or n.id == VLIST then
      n.head = process_list(n.head, link_depth)
      n = n.next
    elseif link_depth == 0 and n.id == GLYPH and not node.has_attribute(n, DONE) then
      local matched = nil
      for _, term in ipairs(terms) do
        local last = try_term(n, term)
        if last then
          matched = {last = last, target = term.target}
          break
        end
      end
      if matched then
        local nxt
        head, nxt = wrap(head, n, matched.last, matched.target)
        n = nxt
      else
        node.set_attribute(n, DONE, 1)
        n = n.next
      end
    else
      if n.id == GLYPH then
        node.set_attribute(n, DONE, 1)
      end
      n = n.next
    end
  end
  return head
end

function ida.process(head)
  return process_list(head, 0)
end

function ida.flush_uses()
  local lines = {}
  for _, rec in ipairs(ida.uses) do
    lines[#lines + 1] = string.format(
      "\\idarecordline{%s}{%d}{%s}",
      rec.target, rec.id, rec.page)
  end
  if #lines > 0 then
    tex.print(lines)
  end
end

local function pre_cb(head)
  return ida.process(head)
end

local function hpack_cb(head)
  return ida.process(head)
end

function ida.install()
  ida.uses = {}
  ida.print_mode = tex.count["ida@printmode"] and tex.count["ida@printmode"] > 0
  luatexbase.add_to_callback("pre_linebreak_filter", pre_cb, "ida_terms_pre")
  luatexbase.add_to_callback("hpack_filter", hpack_cb, "ida_terms_hpack")
end
