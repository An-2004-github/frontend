# -*- coding: utf-8 -*-
"""Patch admin/page.tsx to add infinite scroll pagination."""

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

changes = 0

# ── 1. Add new refs/state after excelInputRef ─────────────────────
old1 = '    const excelInputRef = useRef<HTMLInputElement>(null);\n    const [search, setSearch] = useState("");'
new1 = ('    const excelInputRef = useRef<HTMLInputElement>(null);\n'
        '    const offsetRef = useRef(0);\n'
        '    const hasMoreRef = useRef(false);\n'
        '    const loadingMoreRef = useRef(false);\n'
        '    const sentinelRef = useRef<HTMLDivElement>(null);\n'
        '    const searchRef = useRef("");\n'
        '    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n'
        '    const [loadingMore, setLoadingMore] = useState(false);\n'
        '    const [search, setSearch] = useState("");')
if old1 in src:
    src = src.replace(old1, new1, 1); changes += 1; print("refs added OK")
else:
    print("ERROR: refs insertion point not found")

# ── 2. Replace loadSection ────────────────────────────────────────
old2 = ('    // Load section data\n'
        '    const loadSection = useCallback(async (s: Section) => {\n'
        '        if (s === "dashboard") return;\n'
        '        setLoading(true);\n'
        '        try {\n'
        '            const res = await api.get(`/api/admin/${s}`);\n'
        '            setData(res.data);\n'
        '        } catch { setData([]); }\n'
        '        finally { setLoading(false); }\n'
        '    }, []);')
new2 = ('    // Load section data with server-side pagination\n'
        '    const PAGINATED = ["bookings", "hotels", "flights", "buses", "trains", "users", "promotions"];\n'
        '    const loadSection = useCallback(async (s: Section, append = false) => {\n'
        '        if (s === "dashboard" || s === "wallets") return;\n'
        '        if (append) {\n'
        '            if (loadingMoreRef.current || !hasMoreRef.current) return;\n'
        '            loadingMoreRef.current = true;\n'
        '            setLoadingMore(true);\n'
        '        } else {\n'
        '            setLoading(true);\n'
        '            setData([]);\n'
        '            offsetRef.current = 0;\n'
        '            hasMoreRef.current = false;\n'
        '        }\n'
        '        try {\n'
        '            const usePagination = PAGINATED.includes(s);\n'
        '            const params = usePagination\n'
        '                ? { skip: offsetRef.current, limit: 50, search: searchRef.current }\n'
        '                : {};\n'
        '            const res = await api.get(`/api/admin/${s}`, { params });\n'
        '            const rows = res.data as Record<string, unknown>[];\n'
        '            if (append) setData(prev => [...prev, ...rows]);\n'
        '            else setData(rows);\n'
        '            if (usePagination) {\n'
        '                offsetRef.current += rows.length;\n'
        '                hasMoreRef.current = rows.length >= 50;\n'
        '            }\n'
        '        } catch { if (!append) setData([]); }\n'
        '        finally {\n'
        '            setLoading(false);\n'
        '            setLoadingMore(false);\n'
        '            loadingMoreRef.current = false;\n'
        '        }\n'
        '    }, []);')
if old2 in src:
    src = src.replace(old2, new2, 1); changes += 1; print("loadSection replaced OK")
else:
    print("ERROR: loadSection not found")

# ── 3. Update useEffect for loadSection to reset search ref ──────
old3 = '    useEffect(() => { loadSection(section); setSearch(""); setSelectedHotel(null); }, [section, loadSection]);'
new3 = ('    useEffect(() => {\n'
        '        searchRef.current = "";\n'
        '        setSearch("");\n'
        '        setSelectedHotel(null);\n'
        '        loadSection(section);\n'
        '    }, [section, loadSection]);')
if old3 in src:
    src = src.replace(old3, new3, 1); changes += 1; print("section useEffect OK")
else:
    print("ERROR: section useEffect not found")

# ── 4. Add IntersectionObserver effect after the section useEffect ─
# Insert after the loadDestData useEffect
old4 = ('    useEffect(() => { if (section === "banners" && bannerTab === "destinations") loadDestData(); }, [section, bannerTab, loadDestData]);')
new4 = ('    useEffect(() => { if (section === "banners" && bannerTab === "destinations") loadDestData(); }, [section, bannerTab, loadDestData]);\n'
        '\n'
        '    // Infinite scroll observer\n'
        '    useEffect(() => {\n'
        '        const el = sentinelRef.current;\n'
        '        if (!el) return;\n'
        '        const observer = new IntersectionObserver(entries => {\n'
        '            if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {\n'
        '                loadSection(section, true);\n'
        '            }\n'
        '        }, { rootMargin: "300px" });\n'
        '        observer.observe(el);\n'
        '        return () => observer.disconnect();\n'
        '    }, [section, loadSection]);')
if old4 in src:
    src = src.replace(old4, new4, 1); changes += 1; print("IntersectionObserver effect OK")
else:
    print("ERROR: loadDestData useEffect not found")

# ── 5. Update filteredData computation — paginated sections skip client-side filter ──
old5 = ('    const q = search.trim().toLowerCase();\n'
        '    const filteredData = q === "" ? data : data.filter(row => {\n'
        '        if (section === "hotels") return String(row.name || "").toLowerCase().includes(q) || String(row.dest_city || "").toLowerCase().includes(q) || String(row.address || "").toLowerCase().includes(q);\n'
        '        if (section === "flights") return String(row.airline || "").toLowerCase().includes(q) || String(row.from_city || "").toLowerCase().includes(q) || String(row.to_city || "").toLowerCase().includes(q);\n'
        '        if (section === "buses") return String(row.company || "").toLowerCase().includes(q) || String(row.from_city || "").toLowerCase().includes(q) || String(row.to_city || "").toLowerCase().includes(q);\n'
        '        if (section === "trains") return String(row.train_code || "").toLowerCase().includes(q) || String(row.from_city || "").toLowerCase().includes(q) || String(row.to_city || "").toLowerCase().includes(q);\n'
        '        if (section === "bookings") return String(row.user_name || "").toLowerCase().includes(q) || String(row.user_email || "").toLowerCase().includes(q) || String(row.entity_name || "").toLowerCase().includes(q);\n'
        '        if (section === "users") return String(row.full_name || "").toLowerCase().includes(q) || String(row.email || "").toLowerCase().includes(q) || String(row.phone || "").toLowerCase().includes(q);\n'
        '        if (section === "withdrawals") return String(row.full_name || "").toLowerCase().includes(q) || String(row.email || "").toLowerCase().includes(q) || String(row.bank_name || "").toLowerCase().includes(q) || String(row.account_no || "").toLowerCase().includes(q);\n'
        '        if (section === "promotions") return String(row.code || "").toLowerCase().includes(q) || String(row.description || "").toLowerCase().includes(q);\n'
        '        if (section === "banners") return String(row.title || "").toLowerCase().includes(q) || String(row.subtitle || "").toLowerCase().includes(q);\n'
        '        if (section === "modifications") return String(row.user_name || "").toLowerCase().includes(q) || String(row.user_email || "").toLowerCase().includes(q) || String(row.entity_name || "").toLowerCase().includes(q) || String(row.type || "").toLowerCase().includes(q);\n'
        '        return true;\n'
        '    });')
new5 = ('    const q = search.trim().toLowerCase();\n'
        '    // Paginated sections: server already filtered, skip client-side filter\n'
        '    // Banners/non-paginated: keep client-side filter\n'
        '    const filteredData = (["hotels","flights","buses","trains","bookings","users","promotions"].includes(section))\n'
        '        ? data\n'
        '        : q === "" ? data : data.filter(row => {\n'
        '            if (section === "banners") return String(row.title || "").toLowerCase().includes(q) || String(row.subtitle || "").toLowerCase().includes(q);\n'
        '            return true;\n'
        '        });')
if old5 in src:
    src = src.replace(old5, new5, 1); changes += 1; print("filteredData updated OK")
else:
    print("ERROR: filteredData not found")

# ── 6. Add debounced search handler for paginated sections ────────
# Insert after openCreate / openEdit definitions
old6 = ('    const EXCEL_SECTIONS = ["hotels", "flights", "buses", "trains", "promotions"];')
new6 = ('    const handleSearchChange = (val: string) => {\n'
        '        setSearch(val);\n'
        '        searchRef.current = val;\n'
        '        const PAGINATED_S = ["bookings", "hotels", "flights", "buses", "trains", "users", "promotions"];\n'
        '        if (!PAGINATED_S.includes(section)) return;\n'
        '        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);\n'
        '        searchTimerRef.current = setTimeout(() => { loadSection(section); }, 400);\n'
        '    };\n'
        '\n'
        '    const EXCEL_SECTIONS = ["hotels", "flights", "buses", "trains", "promotions"];')
if old6 in src:
    src = src.replace(old6, new6, 1); changes += 1; print("handleSearchChange added OK")
else:
    print("ERROR: EXCEL_SECTIONS not found")

# ── 7. Wire search inputs to handleSearchChange ───────────────────
# Bookings search input
src = src.replace(
    '<input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />',
    '<input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />',
    1  # only first occurrence = bookings section
)
# Hotels search input
src = src.replace(
    '<input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />',
    '<input className="adm-search" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => handleSearchChange(e.target.value)} />',
)
print("search inputs wired OK")
changes += 1

# ── 8. Add sentinel div + loading-more indicator before </div> closing adm-content ──
old8 = ('                </div>\n'
        '            </main>')
new8 = ('                    {/* Infinite scroll sentinel */}\n'
        '                    <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />\n'
        '                    {loadingMore && (\n'
        '                        <div style={{ textAlign: "center", padding: "1rem 0 0.5rem", color: "#6b8cbf", fontSize: "0.85rem" }}>\n'
        '                            Đang tải thêm...\n'
        '                        </div>\n'
        '                    )}\n'
        '                </div>\n'
        '            </main>')
if old8 in src:
    src = src.replace(old8, new8, 1); changes += 1; print("sentinel div added OK")
else:
    print("ERROR: adm-content close not found")

with open(r'c:/Users/ADMIN/Documents/DATN/frontend/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(src)
print(f"\nDone. Total changes: {changes}")
