export function renderEmbeddedHtml(endpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceLens Inspector — Live Distributed Tracing & Observability</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
        }
      }
    }
  </script>
  <style>
    body { background-color: #070A11; color: #E2E8F0; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0B0F19; }
    ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #374151; }
    
    @keyframes flowPulse {
      0% { stroke-dashoffset: 40; }
      100% { stroke-dashoffset: 0; }
    }
    .flow-line {
      stroke-dasharray: 6, 6;
      animation: flowPulse 1.2s linear infinite;
    }
    .glow-indigo { filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4)); }
    .glow-emerald { filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4)); }
    .glow-amber { filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.4)); }
    .glow-rose { filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.4)); }
    .glow-cyan { filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.4)); }
  </style>
</head>
<body class="h-screen flex flex-col font-sans overflow-hidden">
  <!-- Top Bar -->
  <header class="h-14 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur px-5 flex items-center justify-between shrink-0">
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 font-bold text-white text-base">
        ⚡
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-extrabold text-gray-100 tracking-tight text-base">TraceLens</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">Observability Hub</span>
        </div>
      </div>
    </div>

    <!-- Live Real-Time Metrics Bar -->
    <div class="hidden md:flex items-center space-x-6 text-xs font-mono bg-gray-900/50 px-4 py-1.5 rounded-full border border-gray-800/80">
      <div class="flex items-center space-x-1.5">
        <span class="text-gray-500">Total:</span>
        <span id="metricTotal" class="font-bold text-gray-200">0</span>
      </div>
      <div class="h-3 w-px bg-gray-800"></div>
      <div class="flex items-center space-x-1.5">
        <span class="text-gray-500">Avg Latency:</span>
        <span id="metricAvg" class="font-bold text-indigo-400">0 ms</span>
      </div>
      <div class="h-3 w-px bg-gray-800"></div>
      <div class="flex items-center space-x-1.5">
        <span class="text-gray-500">P95:</span>
        <span id="metricP95" class="font-bold text-amber-400">0 ms</span>
      </div>
      <div class="h-3 w-px bg-gray-800"></div>
      <div class="flex items-center space-x-1.5">
        <span class="text-gray-500">Errors:</span>
        <span id="metricErrors" class="font-bold text-gray-400">0 (0%)</span>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <div id="connectionStatus" class="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/30">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-medium">Live Stream</span>
      </div>
      <button id="clearBtn" class="text-xs px-3 py-1.5 bg-gray-800/60 hover:bg-gray-800 text-gray-300 rounded-md border border-gray-700/60 transition flex items-center space-x-1.5">
        <span>🗑️ Clear RAM</span>
      </button>
    </div>
  </header>

  <!-- Main View -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Panel: Request Feed & Filters -->
    <aside class="w-96 border-r border-gray-800/80 flex flex-col bg-gray-950/30 shrink-0">
      <!-- Search & Filter Controls -->
      <div class="p-3 border-b border-gray-800/60 space-y-2 bg-gray-950/50">
        <div class="relative">
          <input id="searchInput" type="text" placeholder="Search path, method, trace id..." class="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono" />
          <span class="absolute right-2.5 top-2 text-xs text-gray-600">🔍</span>
        </div>
        
        <div class="flex items-center justify-between text-[11px]">
          <div class="flex items-center space-x-1" id="statusFilters">
            <button data-filter="all" class="filter-status-btn px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold">All</button>
            <button data-filter="2xx" class="filter-status-btn px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-gray-200">2xx</button>
            <button data-filter="errors" class="filter-status-btn px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-rose-400">4xx/5xx</button>
          </div>
          
          <select id="durationFilter" class="bg-gray-900 border border-gray-800 text-gray-400 text-[10px] rounded px-1.5 py-0.5 focus:outline-none font-mono">
            <option value="0">All Latency</option>
            <option value="20">> 20ms</option>
            <option value="50">> 50ms</option>
            <option value="100">> 100ms</option>
          </select>
        </div>
      </div>

      <div class="px-3 py-2 border-b border-gray-800/40 flex items-center justify-between text-xs font-semibold text-gray-400">
        <span class="uppercase tracking-wider">Traces (<span id="traceCount">0</span>)</span>
        <span class="text-[10px] text-gray-500 font-mono">RingBuffer (FIFO)</span>
      </div>

      <div id="traceList" class="flex-1 overflow-y-auto divide-y divide-gray-900/60 p-2 space-y-1">
        <div class="p-8 text-center text-gray-500 text-sm">
          Đang chờ request đầu tiên...<br>
          <span class="text-xs text-gray-600">Gọi một API bất kỳ để xem dữ liệu</span>
        </div>
      </div>
    </aside>

    <!-- Right Panel: Trace Detail & Visualizers -->
    <main class="flex-1 flex flex-col bg-gray-950/10 overflow-hidden">
      <div id="detailPlaceholder" class="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm">
        <div class="w-14 h-14 rounded-2xl bg-gray-900/80 border border-gray-800 flex items-center justify-center text-2xl mb-3 text-gray-500 shadow-inner">🌐</div>
        <p class="font-medium text-gray-400">Chọn một Request để xem Live Topology Map & Timeline</p>
        <span class="text-xs text-gray-600 mt-1">Sơ đồ kiến trúc động tự động sinh từ Spans & W3C TraceContext</span>
      </div>

      <div id="detailView" class="hidden flex-1 flex flex-col overflow-hidden">
        <!-- Trace Header Summary -->
        <div class="p-5 border-b border-gray-800/60 bg-gray-900/30 shrink-0">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <span id="detailMethod" class="px-2.5 py-1 text-xs font-bold font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GET</span>
              <h1 id="detailPath" class="text-lg font-bold text-gray-100 font-mono">/api/users</h1>
            </div>
            
            <!-- Export & Action Toolbar -->
            <div class="flex items-center space-x-2">
              <span id="detailStatus" class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-emerald-500/20 text-emerald-400">200 OK</span>
              <span id="detailDuration" class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-indigo-500/20 text-indigo-300">12.4 ms</span>
              
              <div class="h-5 w-px bg-gray-800 mx-1"></div>

              <!-- Action Toolbar: Replay, Diff, AI Agent & Exports -->
              <div class="flex items-center space-x-1.5">
                <button id="btnCopyAgentReport" title="Copy Agent Diagnostic Report (for Cursor, Copilot, Antigravity, Claude Code)" class="px-2.5 py-1 text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-mono font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30">
                  <span>🤖</span><span>Copy for AI Agent</span>
                </button>
                <button id="btnReplayRequest" title="Re-send this request with exact headers & body" class="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono font-medium transition flex items-center space-x-1 shadow-md shadow-indigo-600/30">
                  <span>🔁</span><span>Replay</span>
                </button>
                <button id="btnCompareTrace" title="Compare this trace with another trace (Diff)" class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-purple-300 border border-purple-500/30 rounded font-mono font-medium transition flex items-center space-x-1">
                  <span>⚖️</span><span>Diff</span>
                </button>
                <div class="h-4 w-px bg-gray-800 mx-0.5"></div>
                <button id="btnExportOtel" title="Export OpenTelemetry ResourceSpans JSON" class="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/30 rounded font-mono font-medium transition flex items-center space-x-1">
                  <span>OTel</span>
                </button>
                <button id="btnExportHar" title="Export HTTP Archive (HAR 1.2)" class="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded font-mono font-medium transition flex items-center space-x-1">
                  <span>HAR</span>
                </button>
                <button id="btnCopyCurl" title="Copy as cURL command" class="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded font-mono transition">
                  <span>cURL</span>
                </button>
                <button id="btnExportRaw" title="Export Raw JSON" class="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded font-mono transition">
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Trace Info Meta line -->
          <div class="flex items-center space-x-6 text-xs font-mono text-gray-400">
            <div class="flex items-center space-x-1">
              <span class="text-gray-500">TraceID:</span>
              <span id="detailTraceId" class="text-gray-300 select-all cursor-pointer hover:text-white underline decoration-dotted"></span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-gray-500">Service:</span>
              <span id="detailService" class="text-indigo-400 font-semibold">Order Service</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-gray-500">Spans:</span>
              <span id="detailSpansCount" class="text-emerald-400 font-semibold">0</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-gray-500">Client IP:</span>
              <span id="detailIp" class="text-gray-300">127.0.0.1</span>
            </div>
          </div>

          <!-- Error Alert Banner (nếu có lỗi) -->
          <div id="errorAlertBanner" class="hidden mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-center justify-between space-x-2.5 text-xs text-rose-300 font-mono">
            <div class="flex items-start space-x-2.5 flex-1 cursor-pointer">
              <span class="text-base leading-none">⚠️</span>
              <div>
                <div class="font-bold uppercase tracking-wider text-rose-400" id="errorAlertTitle">Request Failed</div>
                <div class="text-rose-300/90 mt-0.5" id="errorAlertMsg">Internal Server Error</div>
              </div>
            </div>
            <button id="btnCopyErrorForAgent" class="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-mono font-bold transition flex items-center space-x-1 shadow shrink-0">
              <span>🤖</span><span>Copy Error for AI Agent</span>
            </button>
          </div>
        </div>

        <!-- Detail Tabs & Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-5 border-b border-gray-800/60 bg-gray-950/40 flex space-x-6 shrink-0">
            <button id="tabTopologyBtn" class="py-3 text-xs font-bold text-indigo-400 border-b-2 border-indigo-500 tracking-wide flex items-center space-x-1.5">
              <span>🌐</span><span>ARCHITECTURE TOPOLOGY</span>
            </button>
            <button id="tabWaterfallBtn" class="py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 tracking-wide flex items-center space-x-1.5">
              <span>📊</span><span>TIMELINE / WATERFALL</span>
            </button>
            <button id="tabFlamegraphBtn" class="py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 tracking-wide flex items-center space-x-1.5">
              <span>🌲</span><span>FLAME GRAPH & SPAN TREE</span>
            </button>
            <button id="tabAdvisorBtn" class="py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 tracking-wide flex items-center space-x-1.5">
              <span class="relative">⚡<span id="advisorBadgeCount" class="hidden absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span></span>
              <span>AI PERFORMANCE ADVISOR</span>
            </button>
            <button id="tabMetadataBtn" class="py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 tracking-wide flex items-center space-x-1.5">
              <span>📋</span><span>HTTP METADATA</span>
            </button>
          </div>

          <!-- Tab Content 1: Live Architecture Topology Map -->
          <div id="tabTopology" class="flex-1 overflow-auto p-6 relative flex flex-col items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
            <div class="w-full max-w-5xl h-full flex flex-col justify-between relative py-6" id="topologyCanvas">
              <!-- Rendered dynamic nodes & SVG lines -->
            </div>
          </div>

          <!-- Tab Content 2: Waterfall -->
          <div id="tabWaterfall" class="hidden flex-1 overflow-y-auto p-5">
            <div class="mb-3 flex items-center justify-between text-xs text-gray-500 font-mono border-b border-gray-800/40 pb-2">
              <span class="w-1/3">SPAN / MIDDLEWARE / LAYER</span>
              <span class="w-24 text-right">DURATION</span>
              <span class="flex-1 text-right pl-6">EXECUTION TIMELINE</span>
            </div>
            <div id="spansContainer" class="space-y-2">
              <!-- Rendered spans -->
            </div>
          </div>

          <!-- Tab Content 3: Flame Graph & Hierarchical Span Tree -->
          <div id="tabFlamegraph" class="hidden flex-1 overflow-y-auto p-5 font-mono text-xs space-y-2">
            <div class="mb-3 flex items-center justify-between text-xs text-gray-500 font-mono border-b border-gray-800/40 pb-2">
              <span>HIERARCHICAL CALL TREE (PARENT ➔ CHILD)</span>
              <span class="text-[11px] text-gray-400">💡 Click any span to inspect attributes</span>
            </div>
            <div id="flamegraphContainer" class="space-y-1.5">
              <!-- Rendered flame tree nodes -->
            </div>
          </div>

          <!-- Tab Content 4: Metadata -->
          <div id="tabMetadata" class="hidden flex-1 overflow-y-auto p-5 font-mono text-xs space-y-4">
            <div>
              <h3 class="text-gray-400 uppercase font-semibold mb-2">Request Query</h3>
              <pre id="metaQuery" class="bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-emerald-400 overflow-x-auto"></pre>
            </div>
            <div>
              <h3 class="text-gray-400 uppercase font-semibold mb-2">Request Params</h3>
              <pre id="metaParams" class="bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-blue-400 overflow-x-auto"></pre>
            </div>
            <div>
              <h3 class="text-gray-400 uppercase font-semibold mb-2">Headers (Sanitized)</h3>
              <pre id="metaHeaders" class="bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-gray-300 overflow-x-auto"></pre>
            </div>
          </div>

          <!-- Tab Content 5: AI & Performance Advisor -->
          <div id="tabAdvisor" class="hidden flex-1 overflow-y-auto p-6 font-sans space-y-5">
            <!-- Header Banner with AI Prompt trigger -->
            <div class="bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-gray-900 border border-indigo-500/30 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div class="flex items-center space-x-3.5">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25 text-white">
                  🧠
                </div>
                <div>
                  <h3 class="text-sm font-extrabold text-white tracking-wide">Root-Cause & Heuristic Performance Engine</h3>
                  <p class="text-xs text-gray-400 mt-0.5">Automated detection of N+1 queries, un-cached I/O, slow microservices & latency anti-patterns</p>
                </div>
              </div>
              <button id="btnCopyAiPrompt" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-mono font-bold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2 shrink-0">
                <span>🤖</span><span>Copy AI Fix Prompt</span>
              </button>
            </div>

            <!-- Health Summary & Score -->
            <div id="advisorSummaryCard" class="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <!-- Dynamically rendered -->
            </div>

            <!-- Issues & Recommendations List -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-gray-800/40 pb-2">
                <span class="font-bold uppercase tracking-wider text-gray-300">DETECTED BOTTLENECKS & ACTIONABLE FIXES</span>
                <span id="advisorIssuesCount" class="text-indigo-400 font-semibold">0 issues found</span>
              </div>
              <div id="advisorIssuesContainer" class="space-y-3 font-sans">
                <!-- Dynamically populated issues -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Span Diagnostic Inspector Modal -->
  <div id="inspectorModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-gray-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 font-mono">
      <div class="flex items-center justify-between pb-3 border-b border-gray-800">
        <div class="flex items-center space-x-2.5">
          <span class="text-xl" id="modalIcon">🔍</span>
          <h3 class="text-sm font-bold text-gray-100 uppercase tracking-wider" id="modalTitle">Span Inspector</h3>
        </div>
        <button id="closeModalBtn" class="text-gray-400 hover:text-white text-base font-bold px-2 py-1 transition">✕</button>
      </div>
      <div class="space-y-3 text-xs">
        <div>
          <span class="text-gray-500 block mb-1">Span Name & Kind:</span>
          <div id="modalSpanHeader" class="p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-indigo-300 font-bold flex items-center justify-between"></div>
        </div>

        <!-- SQL Query Viewer & Formatter (Hiển thị nếu là Database query) -->
        <div id="modalSqlSection" class="hidden">
          <div class="flex items-center justify-between mb-1">
            <span class="text-gray-400 block font-bold">SQL Query Statement (Syntax Formatted):</span>
            <button id="copyModalSqlBtn" class="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition flex items-center space-x-1">
              <span>📋</span><span>Copy SQL</span>
            </button>
          </div>
          <div id="modalSqlCode" class="p-3 bg-gray-950 rounded-lg border border-emerald-500/30 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap text-gray-200"></div>
        </div>

        <div>
          <span class="text-gray-500 block mb-1">Status / Diagnostics:</span>
          <div id="modalSpanStatus" class="p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap"></div>
        </div>
        <div>
          <span class="text-gray-500 block mb-1">Attributes & Metadata:</span>
          <pre id="modalSpanAttributes" class="p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-emerald-400 max-h-56 overflow-y-auto text-[11px]"></pre>
        </div>
      </div>
      <div class="flex justify-end pt-1">
        <button id="copyModalJsonBtn" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5">
          <span>📋 Copy JSON</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Service Deep-Dive Drawer (Internal Execution Pipeline) -->
  <div id="serviceDrawerBackdrop" class="hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"></div>
  <aside id="serviceDrawer" class="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#090D18]/95 border-l border-indigo-500/30 backdrop-blur-2xl shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full font-sans">
    <!-- Drawer Header -->
    <div class="p-5 border-b border-gray-800/80 bg-gray-900/50 flex items-center justify-between shrink-0">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20 text-white" id="drawerServiceIcon">
          🚀
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-sm font-extrabold text-white uppercase tracking-wider" id="drawerServiceName">ORDER SERVICE</h2>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">INTERNAL DEEP-DIVE</span>
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">Internal Pipeline & Micro-span Decomposition</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span id="drawerTotalDuration" class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">270 ms</span>
        <button id="closeDrawerBtn" class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition">✕</button>
      </div>
    </div>

    <!-- Drawer Content Scrollable -->
    <div class="flex-1 overflow-y-auto p-5 space-y-5" id="drawerBody">
      <!-- Dynamically populated -->
    </div>

    <!-- Drawer Footer Actions -->
    <div class="p-4 border-t border-gray-800/80 bg-gray-900/60 flex items-center justify-between shrink-0 text-xs font-mono">
      <div class="flex items-center space-x-2">
        <button id="drawerJumpFlamegraph" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 rounded-lg border border-indigo-500/30 transition flex items-center space-x-1.5">
          <span>🌲</span><span>View Call Tree</span>
        </button>
        <button id="drawerJumpWaterfall" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition flex items-center space-x-1.5">
          <span>📊</span><span>Waterfall</span>
        </button>
      </div>
      <button id="drawerCloseFooterBtn" class="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition font-medium">
        Close
      </button>
    </div>
  </aside>

  <!-- Trace Diff & Comparison Modal -->
  <div id="traceDiffModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
    <div class="bg-gray-950 border border-purple-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
      <!-- Header -->
      <div class="p-5 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-xl text-purple-300 shadow-lg">
            ⚖️
          </div>
          <div>
            <h2 class="text-sm font-extrabold text-white uppercase tracking-wider">Trace Differential Comparison (Diff)</h2>
            <p class="text-[11px] text-gray-400 mt-0.5">Compare baseline execution vs target profile across Latency, Spans & I/O</p>
          </div>
        </div>
        <button id="closeDiffModalBtn" class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition">✕</button>
      </div>

      <!-- Select Trace to Compare -->
      <div class="p-4 bg-gray-900/30 border-b border-gray-800/60 flex items-center justify-between font-mono text-xs">
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">Baseline Trace (A):</span>
          <span id="diffCurrentTraceLabel" class="text-indigo-300 font-bold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50"></span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">Compare With (B):</span>
          <select id="diffTargetSelect" class="bg-gray-900 border border-purple-500/30 rounded-lg px-2.5 py-1 text-purple-200 focus:outline-none text-xs font-mono">
            <!-- Populated dynamically -->
          </select>
        </div>
      </div>

      <!-- Diff Content Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5" id="diffContentBody">
        <!-- Rendered diff -->
      </div>
    </div>
  </div>

  <script>
    const ENDPOINT = '${endpoint}';
    let traces = [];
    let selectedTraceId = null;
    let currentStatusFilter = 'all';
    let currentMinDuration = 0;
    let searchQuery = '';

    // Elements
    const traceList = document.getElementById('traceList');
    const traceCount = document.getElementById('traceCount');
    const detailPlaceholder = document.getElementById('detailPlaceholder');
    const detailView = document.getElementById('detailView');
    const clearBtn = document.getElementById('clearBtn');
    const searchInput = document.getElementById('searchInput');
    const durationFilter = document.getElementById('durationFilter');
    const statusFilterBtns = document.querySelectorAll('.filter-status-btn');

    // Metrics elements
    const metricTotal = document.getElementById('metricTotal');
    const metricAvg = document.getElementById('metricAvg');
    const metricP95 = document.getElementById('metricP95');
    const metricErrors = document.getElementById('metricErrors');

    // Detail elements
    const detailMethod = document.getElementById('detailMethod');
    const detailPath = document.getElementById('detailPath');
    const detailStatus = document.getElementById('detailStatus');
    const detailDuration = document.getElementById('detailDuration');
    const detailTraceId = document.getElementById('detailTraceId');
    const detailService = document.getElementById('detailService');
    const detailSpansCount = document.getElementById('detailSpansCount');
    const detailIp = document.getElementById('detailIp');
    const errorAlertBanner = document.getElementById('errorAlertBanner');
    const errorAlertTitle = document.getElementById('errorAlertTitle');
    const errorAlertMsg = document.getElementById('errorAlertMsg');
    const spansContainer = document.getElementById('spansContainer');
    const topologyCanvas = document.getElementById('topologyCanvas');
    const metaQuery = document.getElementById('metaQuery');
    const metaParams = document.getElementById('metaParams');
    const metaHeaders = document.getElementById('metaHeaders');

    // Export & Action buttons: Replay, Diff, AI Agent, Exports
    const btnCopyAgentReport = document.getElementById('btnCopyAgentReport');
    const btnCopyErrorForAgent = document.getElementById('btnCopyErrorForAgent');
    const btnReplayRequest = document.getElementById('btnReplayRequest');
    const btnCompareTrace = document.getElementById('btnCompareTrace');
    const btnExportOtel = document.getElementById('btnExportOtel');
    const btnExportHar = document.getElementById('btnExportHar');
    const btnCopyCurl = document.getElementById('btnCopyCurl');
    const btnExportRaw = document.getElementById('btnExportRaw');

    // Tabs
    const tabTopologyBtn = document.getElementById('tabTopologyBtn');
    const tabWaterfallBtn = document.getElementById('tabWaterfallBtn');
    const tabFlamegraphBtn = document.getElementById('tabFlamegraphBtn');
    const tabAdvisorBtn = document.getElementById('tabAdvisorBtn');
    const tabMetadataBtn = document.getElementById('tabMetadataBtn');
    const tabTopology = document.getElementById('tabTopology');
    const tabWaterfall = document.getElementById('tabWaterfall');
    const tabFlamegraph = document.getElementById('tabFlamegraph');
    const tabAdvisor = document.getElementById('tabAdvisor');
    const tabMetadata = document.getElementById('tabMetadata');
    const flamegraphContainer = document.getElementById('flamegraphContainer');

    // Advisor Elements
    const advisorBadgeCount = document.getElementById('advisorBadgeCount');
    const advisorSummaryCard = document.getElementById('advisorSummaryCard');
    const advisorIssuesCount = document.getElementById('advisorIssuesCount');
    const advisorIssuesContainer = document.getElementById('advisorIssuesContainer');
    const btnCopyAiPrompt = document.getElementById('btnCopyAiPrompt');
    let currentAdvisorAnalysis = null;

    // Modal elements
    const inspectorModal = document.getElementById('inspectorModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalSpanHeader = document.getElementById('modalSpanHeader');
    const modalSpanStatus = document.getElementById('modalSpanStatus');
    const modalSpanAttributes = document.getElementById('modalSpanAttributes');
    const copyModalJsonBtn = document.getElementById('copyModalJsonBtn');
    const modalSqlSection = document.getElementById('modalSqlSection');
    const modalSqlCode = document.getElementById('modalSqlCode');
    const copyModalSqlBtn = document.getElementById('copyModalSqlBtn');
    let currentInspectedSpan = null;
    let currentInspectedSql = null;

    // Trace Diff Modal elements
    const traceDiffModal = document.getElementById('traceDiffModal');
    const closeDiffModalBtn = document.getElementById('closeDiffModalBtn');
    const diffCurrentTraceLabel = document.getElementById('diffCurrentTraceLabel');
    const diffTargetSelect = document.getElementById('diffTargetSelect');
    const diffContentBody = document.getElementById('diffContentBody');

    // Service Deep-Dive Drawer elements
    const serviceDrawer = document.getElementById('serviceDrawer');
    const serviceDrawerBackdrop = document.getElementById('serviceDrawerBackdrop');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerCloseFooterBtn = document.getElementById('drawerCloseFooterBtn');
    const drawerServiceIcon = document.getElementById('drawerServiceIcon');
    const drawerServiceName = document.getElementById('drawerServiceName');
    const drawerTotalDuration = document.getElementById('drawerTotalDuration');
    const drawerBody = document.getElementById('drawerBody');
    const drawerJumpFlamegraph = document.getElementById('drawerJumpFlamegraph');
    const drawerJumpWaterfall = document.getElementById('drawerJumpWaterfall');

    function closeServiceDrawer() {
      serviceDrawer.classList.add('translate-x-full');
      serviceDrawerBackdrop.classList.add('hidden');
    }

    closeDrawerBtn.addEventListener('click', closeServiceDrawer);
    drawerCloseFooterBtn.addEventListener('click', closeServiceDrawer);
    serviceDrawerBackdrop.addEventListener('click', closeServiceDrawer);
    drawerJumpFlamegraph.addEventListener('click', () => {
      closeServiceDrawer();
      setActiveTab(tabFlamegraphBtn, tabFlamegraph);
    });
    drawerJumpWaterfall.addEventListener('click', () => {
      closeServiceDrawer();
      setActiveTab(tabWaterfallBtn, tabWaterfall);
    });

    closeModalBtn.addEventListener('click', () => inspectorModal.classList.add('hidden'));
    inspectorModal.addEventListener('click', (e) => {
      if (e.target === inspectorModal) inspectorModal.classList.add('hidden');
    });

    closeDiffModalBtn.addEventListener('click', () => traceDiffModal.classList.add('hidden'));
    traceDiffModal.addEventListener('click', (e) => {
      if (e.target === traceDiffModal) traceDiffModal.classList.add('hidden');
    });

    copyModalJsonBtn.addEventListener('click', async () => {
      if (!currentInspectedSpan) return;
      await navigator.clipboard.writeText(JSON.stringify(currentInspectedSpan, null, 2));
      const oldText = copyModalJsonBtn.innerHTML;
      copyModalJsonBtn.innerHTML = '<span class="text-emerald-400 font-bold">✓ Copied!</span>';
      setTimeout(() => { copyModalJsonBtn.innerHTML = oldText; }, 1500);
    });

    copyModalSqlBtn.addEventListener('click', async () => {
      if (!currentInspectedSql) return;
      await navigator.clipboard.writeText(currentInspectedSql);
      const oldText = copyModalSqlBtn.innerHTML;
      copyModalSqlBtn.innerHTML = '<span class="text-emerald-400 font-bold">✓ Copied SQL!</span>';
      setTimeout(() => { copyModalSqlBtn.innerHTML = oldText; }, 1500);
    });

    function setActiveTab(activeBtn, activePanel) {
      [tabTopologyBtn, tabWaterfallBtn, tabFlamegraphBtn, tabAdvisorBtn, tabMetadataBtn].forEach(btn => {
        btn.className = 'py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 tracking-wide flex items-center space-x-1.5';
      });
      [tabTopology, tabWaterfall, tabFlamegraph, tabAdvisor, tabMetadata].forEach(panel => panel.classList.add('hidden'));

      activeBtn.className = 'py-3 text-xs font-bold text-indigo-400 border-b-2 border-indigo-500 tracking-wide flex items-center space-x-1.5';
      activePanel.classList.remove('hidden');
    }

    tabTopologyBtn.addEventListener('click', () => setActiveTab(tabTopologyBtn, tabTopology));
    tabWaterfallBtn.addEventListener('click', () => setActiveTab(tabWaterfallBtn, tabWaterfall));
    tabFlamegraphBtn.addEventListener('click', () => setActiveTab(tabFlamegraphBtn, tabFlamegraph));
    tabAdvisorBtn.addEventListener('click', () => setActiveTab(tabAdvisorBtn, tabAdvisor));
    tabMetadataBtn.addEventListener('click', () => setActiveTab(tabMetadataBtn, tabMetadata));

    // 1-Click Request Replay Handler
    btnReplayRequest.addEventListener('click', async () => {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;

      const method = trace.http?.method || 'GET';
      const url = trace.http?.url || trace.http?.path || '/';

      btnReplayRequest.disabled = true;
      const originalHtml = btnReplayRequest.innerHTML;
      btnReplayRequest.innerHTML = '<span class="animate-spin text-xs">🔄</span><span>Sending...</span>';

      try {
        const headers = { ...trace.http?.headers };
        delete headers['host'];
        delete headers['content-length'];
        delete headers['connection'];

        const fetchOptions = {
          method,
          headers: {
            'content-type': 'application/json',
            ...headers,
          },
        };

        if (method !== 'GET' && method !== 'HEAD') {
          if (trace.http?.body) {
            fetchOptions.body = typeof trace.http.body === 'string' ? trace.http.body : JSON.stringify(trace.http.body);
          } else if (url.includes('/orders')) {
            fetchOptions.body = JSON.stringify({ items: 2 });
          }
        }

        const t0 = performance.now();
        const res = await fetch(url, fetchOptions);
        const elapsed = Math.round(performance.now() - t0);

        btnReplayRequest.className = 'px-2.5 py-1 text-xs bg-emerald-600 text-white rounded font-mono font-medium transition flex items-center space-x-1 shadow-md shadow-emerald-600/30';
        btnReplayRequest.innerHTML = '<span>✓</span><span>Replayed (' + res.status + ' • ' + elapsed + 'ms)</span>';
        setTimeout(() => {
          btnReplayRequest.className = 'px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono font-medium transition flex items-center space-x-1 shadow-md shadow-indigo-600/30';
          btnReplayRequest.innerHTML = originalHtml;
          btnReplayRequest.disabled = false;
        }, 2500);
      } catch (err) {
        btnReplayRequest.className = 'px-2.5 py-1 text-xs bg-rose-600 text-white rounded font-mono font-medium transition flex items-center space-x-1 shadow-md shadow-rose-600/30';
        btnReplayRequest.innerHTML = '<span>✕</span><span>Failed</span>';
        setTimeout(() => {
          btnReplayRequest.className = 'px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono font-medium transition flex items-center space-x-1 shadow-md shadow-indigo-600/30';
          btnReplayRequest.innerHTML = originalHtml;
          btnReplayRequest.disabled = false;
        }, 2500);
      }
    });

    // Trace Diff Modal Handler
    btnCompareTrace.addEventListener('click', () => {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;

      const otherTraces = traces.filter(t => t.id !== selectedTraceId);
      if (otherTraces.length === 0) {
        alert('Cần ít nhất 2 requests trong lịch sử để so sánh Diff. Hãy gọi thêm một API hoặc bấm Replay!');
        return;
      }

      diffCurrentTraceLabel.innerText = (trace.http?.method || 'GET') + ' ' + (trace.http?.path || trace.name) + ' (' + trace.durationMs + 'ms)';
      diffTargetSelect.innerHTML = otherTraces.map(t => '<option value="' + t.id + '">' + (t.http?.method || 'GET') + ' ' + (t.http?.path || t.name) + ' - ' + t.durationMs + 'ms [' + t.id.slice(0, 8) + ']</option>').join('');

      renderDiffComparison(trace, otherTraces[0]);
      traceDiffModal.classList.remove('hidden');
    });

    diffTargetSelect.addEventListener('change', (e) => {
      const traceA = traces.find(t => t.id === selectedTraceId);
      const traceB = traces.find(t => t.id === e.target.value);
      if (traceA && traceB) {
        renderDiffComparison(traceA, traceB);
      }
    });

    // Filters event listeners
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderTraceList();
    });

    durationFilter.addEventListener('change', (e) => {
      currentMinDuration = Number(e.target.value) || 0;
      renderTraceList();
    });

    statusFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        statusFilterBtns.forEach(b => {
          b.className = 'filter-status-btn px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-gray-200';
        });
        btn.className = 'filter-status-btn px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold';
        currentStatusFilter = btn.dataset.filter;
        renderTraceList();
      });
    });

    clearBtn.addEventListener('click', async () => {
      await fetch(ENDPOINT + '/api/clear', { method: 'POST' });
      traces = [];
      selectedTraceId = null;
      updateMetrics();
      renderTraceList();
      detailView.classList.add('hidden');
      detailPlaceholder.classList.remove('hidden');
    });

    // Export handler
    btnExportOtel.addEventListener('click', () => {
      if (!selectedTraceId) return;
      window.open(\`\${ENDPOINT}/api/traces/\${selectedTraceId}/export?format=otel\`, '_blank');
    });

    btnExportHar.addEventListener('click', () => {
      if (!selectedTraceId) return;
      window.open(\`\${ENDPOINT}/api/traces/\${selectedTraceId}/export?format=har\`, '_blank');
    });

    btnExportRaw.addEventListener('click', () => {
      if (!selectedTraceId) return;
      window.open(\`\${ENDPOINT}/api/traces/\${selectedTraceId}/export?format=json\`, '_blank');
    });

    btnCopyCurl.addEventListener('click', async () => {
      if (!selectedTraceId) return;
      try {
        const res = await fetch(\`\${ENDPOINT}/api/traces/\${selectedTraceId}/export?format=curl\`);
        const curlCmd = await res.text();
        await navigator.clipboard.writeText(curlCmd);
        const originalText = btnCopyCurl.innerHTML;
        btnCopyCurl.innerHTML = '<span class="text-emerald-400 font-bold">✓ Copied!</span>';
        setTimeout(() => { btnCopyCurl.innerHTML = originalText; }, 1800);
      } catch (err) {
        alert('Could not copy cURL: ' + err);
      }
    });

    function getMethodBadge(method) {
      const colors = {
        GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        POST: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      };
      return colors[method] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }

    function updateMetrics() {
      const count = traces.length;
      metricTotal.innerText = count;

      if (count === 0) {
        metricAvg.innerText = '0 ms';
        metricP95.innerText = '0 ms';
        metricErrors.innerText = '0 (0%)';
        return;
      }

      const durations = traces.map(t => t.durationMs || 0).sort((a, b) => a - b);
      const avg = (durations.reduce((a, b) => a + b, 0) / count).toFixed(1);
      const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
      const p95 = durations[p95Index].toFixed(1);

      const errorCount = traces.filter(t => (t.http?.statusCode || 200) >= 400 || t.status?.code === 'ERROR').length;
      const errorRate = ((errorCount / count) * 100).toFixed(1);

      metricAvg.innerText = \`\${avg} ms\`;
      metricP95.innerText = \`\${p95} ms\`;
      metricErrors.innerText = \`\${errorCount} (\${errorRate}%)\`;
      metricErrors.className = errorCount > 0 ? 'font-bold text-rose-400' : 'font-bold text-gray-400';
    }

    function filterTraces(items) {
      return items.filter(trace => {
        const method = (trace.http?.method || 'GET').toLowerCase();
        const path = (trace.http?.path || trace.name || '').toLowerCase();
        const id = (trace.id || '').toLowerCase();
        const statusCode = trace.http?.statusCode || 200;
        const duration = trace.durationMs || 0;

        // Enhanced search query (path, method, id, service, span names, attributes)
        if (searchQuery) {
          const matchesPath = path.includes(searchQuery);
          const matchesMethod = method.includes(searchQuery);
          const matchesId = id.includes(searchQuery);
          const matchesService = (trace.serviceName || '').toLowerCase().includes(searchQuery);
          const matchesSpans = trace.spans.some(s => {
            if (s.name.toLowerCase().includes(searchQuery)) return true;
            if (s.kind?.toLowerCase().includes(searchQuery)) return true;
            return Object.entries(s.attributes || {}).some(([k, v]) =>
              k.toLowerCase().includes(searchQuery) || String(v).toLowerCase().includes(searchQuery)
            );
          });
          if (!matchesPath && !matchesMethod && !matchesId && !matchesService && !matchesSpans) {
            return false;
          }
        }

        // Status code filter
        if (currentStatusFilter === '2xx' && (statusCode < 200 || statusCode >= 300)) return false;
        if (currentStatusFilter === 'errors' && statusCode < 400 && trace.status?.code !== 'ERROR') return false;

        // Duration filter
        if (currentMinDuration > 0 && duration < currentMinDuration) return false;

        return true;
      });
    }

    function renderTraceList() {
      const filtered = filterTraces(traces);
      traceCount.innerText = \`\${filtered.length}/\${traces.length}\`;

      if (filtered.length === 0) {
        traceList.innerHTML = \`<div class="p-8 text-center text-gray-500 text-sm">Không tìm thấy trace nào phù hợp</div>\`;
        return;
      }

      traceList.innerHTML = filtered.map(trace => {
        const isSelected = trace.id === selectedTraceId;
        const method = trace.http?.method || 'GET';
        const path = trace.http?.path || trace.name;
        const statusCode = trace.http?.statusCode || 200;
        const isError = statusCode >= 400 || trace.status?.code === 'ERROR';

        return \`
          <div onclick="selectTrace('\${trace.id}')" class="p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between \${isSelected ? 'bg-indigo-950/40 border border-indigo-500/40 shadow-sm' : 'hover:bg-gray-900/70 border border-transparent'}">
            <div class="flex items-center space-x-2.5 overflow-hidden">
              <span class="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border \${getMethodBadge(method)}">\${method}</span>
              <span class="text-xs font-mono text-gray-200 truncate">\${path}</span>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-[11px] font-mono \${isError ? 'text-rose-400 font-bold' : 'text-gray-400'}">\${statusCode}</span>
              <span class="text-[11px] font-mono text-indigo-400">\${trace.durationMs}ms</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectTrace(id) {
      selectedTraceId = id;
      const trace = traces.find(t => t.id === id);
      if (!trace) return;

      renderTraceList();
      detailPlaceholder.classList.add('hidden');
      detailView.classList.remove('hidden');

      const isError = (trace.http?.statusCode || 200) >= 400 || trace.status?.code === 'ERROR';

      detailMethod.innerText = trace.http?.method || 'GET';
      detailMethod.className = \`px-2.5 py-1 text-xs font-bold font-mono rounded border \${getMethodBadge(trace.http?.method || 'GET')}\`;
      detailPath.innerText = trace.http?.path || trace.name;
      detailStatus.innerText = \`\${trace.http?.statusCode || 200} \${trace.status?.code || 'OK'}\`;
      detailStatus.className = \`px-2.5 py-1 text-xs font-mono font-bold rounded \${isError ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}\`;
      detailDuration.innerText = \`\${trace.durationMs} ms\`;
      detailTraceId.innerText = trace.id;
      detailService.innerText = trace.serviceName || 'Express App';
      detailSpansCount.innerText = trace.spans.length;
      detailIp.innerText = trace.http?.clientIp || '127.0.0.1';

      if (isError) {
        errorAlertBanner.classList.remove('hidden');
        errorAlertTitle.innerText = \`Status \${trace.http?.statusCode || 500}: \${trace.status?.code || 'ERROR'}\`;
        errorAlertMsg.innerText = trace.status?.message || 'Request responded with an error status or caught exception.';
      } else {
        errorAlertBanner.classList.add('hidden');
      }

      metaQuery.innerText = JSON.stringify(trace.http?.query || {}, null, 2);
      metaParams.innerText = JSON.stringify(trace.http?.params || {}, null, 2);
      metaHeaders.innerText = JSON.stringify(trace.http?.headers || {}, null, 2);

      renderWaterfall(trace);
      renderFlamegraph(trace);
      renderTopology(trace);
      renderAdvisorTab(trace);
    }

    /**
     * SQL Formatter & Syntax Highlighter
     */
    function formatAndHighlightSql(sql) {
      if (!sql || typeof sql !== 'string') return '';
      let text = sql.trim();
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'INSERT', 'INTO', 'VALUES',
        'UPDATE', 'SET', 'DELETE FROM', 'DELETE', 'LEFT JOIN', 'RIGHT JOIN',
        'INNER JOIN', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC',
        'LIMIT', 'OFFSET', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'AS',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'HAVING', 'EXISTS', 'DISTINCT',
        'RETURNING', 'BEGIN', 'COMMIT', 'ROLLBACK'
      ];
      const regex = new RegExp('\\\\b(' + keywords.join('|') + ')\\\\b', 'gi');
      text = text.replace(regex, match => \`<span class="text-indigo-400 font-bold uppercase">\${match}</span>\`);

      text = text.replace(/(\\\\\\$\\d+|\\?|:\\w+|\\\\b\\d+\\\\b)/g, '<span class="text-amber-400 font-mono font-bold">$1</span>');
      text = text.replace(/('(?:[^'\\\\\\\\]|\\\\\\\\.)*')/g, '<span class="text-emerald-300">$1</span>');

      return text;
    }

    /**
     * AI & Performance Analysis Engine
     */
    function analyzeTracePerformance(trace) {
      const issues = [];
      const totalTime = Math.max(0.1, trace.durationMs || 1);

      // 1. N+1 Query Detection
      const dbSpans = trace.spans.filter(s => s.attributes?.['db.system'] && s.attributes['db.system'] !== 'redis');
      const querySignatures = new Map();
      dbSpans.forEach(s => {
        const raw = s.attributes?.['db.statement'] || s.name || '';
        const normalized = raw
          .replace(/\\b\\d+\\b/g, '?')
          .replace(/'[^']*'/g, "'?'")
          .replace(/\\$\\d+/g, '?')
          .trim()
          .toLowerCase();
        if (!querySignatures.has(normalized)) querySignatures.set(normalized, []);
        querySignatures.get(normalized).push(s);
      });

      for (const [sig, group] of querySignatures.entries()) {
        if (group.length >= 2) {
          const totalGroupTime = group.reduce((a, b) => a + (b.durationMs || 0), 0);
          issues.push({
            type: 'n_plus_one',
            severity: 'CRITICAL',
            icon: '🚨',
            title: \`Potential N+1 Query Detected (\${group.length}x duplicate executions)\`,
            badge: 'CRITICAL',
            badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
            description: \`Query template executed \${group.length} times within this single request, totaling \${totalGroupTime.toFixed(1)}ms.\`,
            sample: group[0].attributes?.['db.statement'] || group[0].name,
            recommendation: 'Replace loops with batch queries using WHERE IN (...), SQL JOIN, or an ORM DataLoader pattern.',
          });
        }
      }

      // 2. Slow Outgoing HTTP / External Dependency Bottleneck
      const externalSpans = trace.spans.filter(s => 
        (s.attributes?.['component'] === 'fetch' || (s.kind === 'CLIENT' && !s.attributes?.['db.system'])) &&
        s.spanId !== trace.rootSpanId
      );
      const totalExternalTime = externalSpans.reduce((a, b) => a + (b.durationMs || 0), 0);
      const externalPercent = (totalExternalTime / totalTime) * 100;

      if (totalExternalTime > 25 && externalPercent > 30) {
        issues.push({
          type: 'slow_external',
          severity: 'WARNING',
          icon: '🌐',
          title: \`External Calls dominate \${externalPercent.toFixed(0)}% of Total Latency\`,
          badge: 'EXTERNAL BOTTLENECK',
          badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          description: \`\${externalSpans.length} outgoing HTTP request(s) consumed \${totalExternalTime.toFixed(1)}ms out of \${totalTime}ms.\`,
          sample: externalSpans.map(s => \`• \${s.name} (\${s.durationMs}ms)\`).join('\\n'),
          recommendation: 'If these microservice/API calls are independent, execute them in parallel using Promise.allSettled() or add a response cache.',
        });
      }

      // 3. Cache Optimization Opportunity
      const redisSpans = trace.spans.filter(s => s.attributes?.['db.system'] === 'redis');
      const totalDbTime = dbSpans.reduce((a, b) => a + (b.durationMs || 0), 0);
      const hasCacheMiss = redisSpans.some(s => s.attributes?.['cache.hit'] === false);

      if (redisSpans.length === 0 && totalDbTime > 20) {
        issues.push({
          type: 'missing_cache',
          severity: 'INFO',
          icon: '⚡',
          title: \`Uncached Database Operations (\${totalDbTime.toFixed(1)}ms)\`,
          badge: 'CACHE OPPORTUNITY',
          badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
          description: \`Direct database queries executed without a caching layer.\`,
          recommendation: 'Wrap repeated read queries with Redis Cache-Aside (check redis.get -> query DB -> redis.setex) to drop latency to < 2ms.',
        });
      } else if (hasCacheMiss) {
        issues.push({
          type: 'cache_miss',
          severity: 'INFO',
          icon: '🔴',
          title: 'Cache Miss Occurred',
          badge: 'CACHE MISS',
          badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          description: 'Redis cache lookup returned a MISS, incurring primary database fallback cost.',
          recommendation: 'Ensure cache TTLs are well-tuned and consider pre-warming cache for hot entities.',
        });
      }

      // 4. Slow Middleware Warning
      const middlewareSpans = trace.spans.filter(s => 
        s.attributes?.['express.component'] === 'middleware' || 
        s.name.toLowerCase().includes('middleware') || 
        s.name === 'corsMiddleware' || 
        s.name === 'authMiddleware'
      );
      const slowMiddleware = middlewareSpans.filter(s => s.durationMs > 10);
      if (slowMiddleware.length > 0) {
        issues.push({
          type: 'slow_middleware',
          severity: 'WARNING',
          icon: '⏱️',
          title: \`Slow Middleware: \${slowMiddleware[0].name} (\${slowMiddleware[0].durationMs}ms)\`,
          badge: 'MIDDLEWARE',
          badgeClass: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
          description: \`Middleware "\${slowMiddleware[0].name}" took \${slowMiddleware[0].durationMs}ms before handler execution.\`,
          recommendation: 'Verify if token verification, permission parsing, or async calls inside this middleware can be streamlined.',
        });
      }

      const selfCompute = Math.max(0.5, totalTime - totalDbTime - totalExternalTime);

      return {
        issues,
        totalTime,
        dbTime: totalDbTime,
        redisTime: redisSpans.reduce((a, b) => a + (b.durationMs || 0), 0),
        externalTime: totalExternalTime,
        selfComputeTime: selfCompute,
      };
    }

    function renderAdvisorTab(trace) {
      const analysis = analyzeTracePerformance(trace);
      currentAdvisorAnalysis = { trace, analysis };

      if (analysis.issues.length > 0) {
        advisorBadgeCount.classList.remove('hidden');
      } else {
        advisorBadgeCount.classList.add('hidden');
      }

      advisorIssuesCount.innerText = \`\${analysis.issues.length} issue(s) identified\`;

      // Render Summary Cards
      const healthScore = Math.max(20, 100 - (analysis.issues.length * 20) - (trace.durationMs > 200 ? 15 : 0));
      const scoreColor = healthScore >= 80 ? 'text-emerald-400 border-emerald-500/30' : healthScore >= 50 ? 'text-amber-400 border-amber-500/30' : 'text-rose-400 border-rose-500/30';

      advisorSummaryCard.innerHTML = \`
        <div class="p-4 rounded-xl bg-gray-900/70 border \${scoreColor} shadow-lg space-y-1">
          <div class="text-gray-400 text-[11px] uppercase">Performance Score</div>
          <div class="text-2xl font-extrabold \${scoreColor.split(' ')[0]}">\${healthScore}/100</div>
          <div class="text-[10px] text-gray-500">\${healthScore >= 80 ? 'Healthy & Efficient' : healthScore >= 50 ? 'Optimizable Bottlenecks' : 'Critical Latency Hotspots'}</div>
        </div>

        <div class="p-4 rounded-xl bg-gray-900/70 border border-gray-800 shadow-lg space-y-1">
          <div class="text-gray-400 text-[11px] uppercase">I/O Wait Ratio</div>
          <div class="text-2xl font-extrabold text-cyan-400">\${(((analysis.dbTime + analysis.externalTime) / analysis.totalTime) * 100).toFixed(0)}%</div>
          <div class="text-[10px] text-gray-500">\${(analysis.dbTime + analysis.externalTime).toFixed(1)}ms spent waiting on I/O</div>
        </div>

        <div class="p-4 rounded-xl bg-gray-900/70 border border-gray-800 shadow-lg space-y-1">
          <div class="text-gray-400 text-[11px] uppercase">Active Issues</div>
          <div class="text-2xl font-extrabold \${analysis.issues.length > 0 ? 'text-amber-400' : 'text-emerald-400'}">\${analysis.issues.length}</div>
          <div class="text-[10px] text-gray-500">\${analysis.issues.length > 0 ? 'Actionable optimizations available' : 'Zero anti-patterns detected'}</div>
        </div>
      \`;

      // Render Issues List
      if (analysis.issues.length === 0) {
        advisorIssuesContainer.innerHTML = \`
          <div class="p-8 text-center bg-gray-900/40 border border-emerald-500/20 rounded-2xl space-y-2">
            <span class="text-3xl">🎉</span>
            <div class="font-bold text-gray-200 text-sm">Optimal Performance Profile!</div>
            <p class="text-xs text-gray-500 max-w-md mx-auto">No N+1 queries, un-cached hotspots, or blocking bottlenecks detected for this execution.</p>
          </div>
        \`;
        return;
      }

      advisorIssuesContainer.innerHTML = analysis.issues.map(issue => \`
        <div class="p-4 rounded-xl bg-gray-900/80 border border-gray-800/90 shadow-xl space-y-3 font-sans transition hover:border-gray-700">
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="text-xl">\${issue.icon}</span>
              <div>
                <h4 class="font-bold text-sm text-gray-100">\${issue.title}</h4>
                <p class="text-xs text-gray-400 mt-0.5">\${issue.description}</p>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold \${issue.badgeClass}">\${issue.badge}</span>
          </div>

          \${issue.sample ? \`
            <div class="bg-gray-950 p-2.5 rounded-lg border border-gray-800 font-mono text-[11px] text-gray-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
              \${issue.sample}
            </div>
          \` : ''}

          <div class="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 flex items-start space-x-2 text-xs">
            <span class="text-indigo-400 font-bold shrink-0">💡 Fix:</span>
            <span class="text-indigo-200/90 leading-relaxed">\${issue.recommendation}</span>
          </div>
        </div>
      \`).join('');
    }

    // AI Prompt Copy Handler
    btnCopyAiPrompt.addEventListener('click', async () => {
      if (!currentAdvisorAnalysis) return;
      const { trace, analysis } = currentAdvisorAnalysis;

      const pLines = [
        'Tôi đang tối ưu hiệu năng API endpoint trong Node.js (Express / Fastify):',
        '- API: ' + (trace.http?.method || 'POST') + ' ' + (trace.http?.path || trace.name),
        '- Status: ' + (trace.http?.statusCode || 200),
        '- Tổng thời gian phản hồi: ' + trace.durationMs + 'ms',
        '',
        'PHÂN BỔ THỜI GIAN THỰC THI:',
        '- Self-compute (Xử lý nội bộ / CPU): ' + analysis.selfComputeTime.toFixed(1) + 'ms',
        '- Database Query I/O: ' + analysis.dbTime.toFixed(1) + 'ms',
        '- Redis Cache: ' + analysis.redisTime.toFixed(1) + 'ms',
        '- External / Microservices HTTP: ' + analysis.externalTime.toFixed(1) + 'ms',
        '',
        'CÁC ĐIỂM NGHẼN TRACELENS ĐÃ TỰ ĐỘNG PHÁT HIỆN:'
      ];

      analysis.issues.forEach((iss, idx) => {
        pLines.push((idx + 1) + '. [' + iss.severity + '] ' + iss.title);
        pLines.push('   Chi tiết: ' + iss.description);
        pLines.push('   Gợi ý: ' + iss.recommendation);
        pLines.push('');
      });

      pLines.push('DANH SÁCH SPANS CHÍNH TRONG CHUỖI GỌI:');
      trace.spans.forEach(s => {
        pLines.push('- [' + s.kind + '] ' + s.name + ' (' + s.durationMs + 'ms)');
      });

      pLines.push('');
      pLines.push('Hãy phân tích nguyên nhân gốc rễ và đưa ra giải pháp refactor code cụ thể (kèm ví dụ code TypeScript / Node.js mẫu) để giảm độ trễ của API này xuống mức tối ưu nhất.');

      await navigator.clipboard.writeText(pLines.join(String.fromCharCode(10)));
      const oldHtml = btnCopyAiPrompt.innerHTML;
      btnCopyAiPrompt.innerHTML = '<span>✓</span><span>Copied AI Prompt to Clipboard!</span>';
      setTimeout(() => { btnCopyAiPrompt.innerHTML = oldHtml; }, 2000);
    });

    /**
     * Generate Comprehensive Markdown Report for AI Coding Agents (Cursor, Copilot, Claude Code, Antigravity)
     */
    function generateAgentDiagnosticMarkdown(trace) {
      const analysis = analyzeTracePerformance(trace);
      const isError = (trace.http?.statusCode || 200) >= 400 || trace.status?.code === 'ERROR';
      const method = trace.http?.method || 'POST';
      const path = trace.http?.path || trace.name || '/';
      const status = trace.http?.statusCode || 200;
      const failingSpan = trace.spans.find(s => s.status?.code === 'ERROR');

      const B = String.fromCharCode(96);
      const BT3 = B + B + B;
      const lines = [];

      lines.push('# ⚡ TraceLens Observability Report: ' + method + ' ' + path);
      lines.push('');
      lines.push('> **Target for AI Coding Agents (Cursor / GitHub Copilot / Claude Code / Antigravity / Windsurf)**');
      lines.push('> **Trace ID**: ' + B + trace.id + B);
      lines.push('> **Service**: ' + B + (trace.serviceName || 'Express App') + B);
      lines.push('> **HTTP Status**: ' + B + status + ' ' + (trace.status?.code || 'OK') + B);
      lines.push('> **Total Latency**: ' + B + trace.durationMs + 'ms' + B + ' (Optimization Target: < 100ms)');
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## 🎯 Target Endpoint Context');
      lines.push('- **Method & Route**: ' + B + method + ' ' + path + B);
      if (trace.http?.clientIp) lines.push('- **Client IP**: ' + B + trace.http.clientIp + B);
      if (trace.http?.client) {
        lines.push('- **Initiating Client**: ' + B + (trace.http.client.component || 'Client') + B + ' (Action: ' + B + (trace.http.client.action || 'Request') + B + ')');
      }

      if (isError) {
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('## 💥 Error / Exception Diagnostics');
        lines.push('- **Status**: ' + B + status + ' ' + (trace.status?.code || 'ERROR') + B);
        lines.push('- **Error Message**: ' + B + (trace.status?.message || 'Server responded with an error') + B);
        if (failingSpan) {
          lines.push('- **Failing Span**: ' + B + failingSpan.name + B + ' (' + failingSpan.kind + ', ' + failingSpan.durationMs + 'ms)');
          if (failingSpan.attributes && failingSpan.attributes['error.type']) {
            lines.push('- **Error Type**: ' + B + failingSpan.attributes['error.type'] + B);
          }
        }
      }

      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## 🚨 Detected Performance Bottlenecks & Anti-Patterns');
      if (analysis.issues.length === 0) {
        lines.push('✓ No significant architectural bottlenecks or N+1 queries detected.');
      } else {
        analysis.issues.forEach((iss, i) => {
          lines.push('### Issue ' + (i + 1) + ': ' + iss.title);
          lines.push('- **Severity**: ' + B + iss.severity + B);
          lines.push('- **Impact**: ' + iss.description);
          if (iss.sample) lines.push('- **Details / Sample**: ' + B + iss.sample.replace(/\\n/g, ' ') + B);
          lines.push('- **Actionable Fix**: ' + iss.recommendation);
          lines.push('');
        });
      }

      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## ⏱️ Latency & Execution Breakdown');
      lines.push('- **Self Compute / Logic Time**: ' + B + analysis.selfComputeTime.toFixed(1) + 'ms' + B + ' (' + ((analysis.selfComputeTime / Math.max(0.1, trace.durationMs)) * 100).toFixed(0) + '%)');
      lines.push('- **Database I/O Wait**: ' + B + analysis.dbTime.toFixed(1) + 'ms' + B + ' (' + ((analysis.dbTime / Math.max(0.1, trace.durationMs)) * 100).toFixed(0) + '%)');
      lines.push('- **Redis Cache Time**: ' + B + analysis.redisTime.toFixed(1) + 'ms' + B);
      lines.push('- **Downstream External / Microservice Calls**: ' + B + analysis.externalTime.toFixed(1) + 'ms' + B + ' (' + ((analysis.externalTime / Math.max(0.1, trace.durationMs)) * 100).toFixed(0) + '%)');

      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## 🌲 Execution Call Hierarchy (Spans)');
      lines.push(BT3 + 'text');
      trace.spans.forEach(s => {
        const kind = (s.kind || 'INTERNAL').padEnd(8);
        const name = (s.name || '').padEnd(36);
        const dur = (String(s.durationMs) + 'ms').padStart(8);
        const st = s.status?.code || 'OK';
        lines.push('[' + kind + '] ' + name + ' ' + dur + ' (' + st + ')');
      });
      lines.push(BT3);

      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## 🤖 Action Items for AI Coding Agent:');
      lines.push('1. Search the codebase for the file implementing route ' + B + method + ' ' + path + B + '.');
      if (isError) {
        lines.push('2. Locate where the unhandled exception occurs and fix the error with proper input validation and error handling.');
      }
      if (analysis.issues.length > 0) {
        lines.push('3. Resolve the bottlenecks identified above:');
        analysis.issues.forEach(iss => {
          lines.push('   - ' + iss.recommendation);
        });
      }
      lines.push('4. Ensure response schema and status codes remain compatible.');
      lines.push('5. Provide the edited code and a summary of your optimization.');

      return lines.join(String.fromCharCode(10));
    }

    async function copyAgentReportToClipboard() {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;
      const report = generateAgentDiagnosticMarkdown(trace);
      await navigator.clipboard.writeText(report);

      if (btnCopyAgentReport) {
        const orig = btnCopyAgentReport.innerHTML;
        btnCopyAgentReport.className = 'px-2.5 py-1 text-xs bg-emerald-600 text-white rounded font-mono font-bold transition flex items-center space-x-1 shadow-md shadow-emerald-600/30';
        btnCopyAgentReport.innerHTML = '<span>✓</span><span>Copied for AI Agent!</span>';
        setTimeout(() => {
          btnCopyAgentReport.className = 'px-2.5 py-1 text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-mono font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30';
          btnCopyAgentReport.innerHTML = orig;
        }, 2000);
      }
    }

    if (btnCopyAgentReport) {
      btnCopyAgentReport.addEventListener('click', copyAgentReportToClipboard);
    }
    if (btnCopyErrorForAgent) {
      btnCopyErrorForAgent.addEventListener('click', copyAgentReportToClipboard);
    }

    /**
     * Render Differential Trace Comparison (Trace A vs Trace B)
     */
    function renderDiffComparison(traceA, traceB) {
      const durA = traceA.durationMs || 0.1;
      const durB = traceB.durationMs || 0.1;
      const deltaMs = Number((durB - durA).toFixed(1));
      const deltaPercent = Number(((deltaMs / durA) * 100).toFixed(1));
      const isFaster = deltaMs <= 0;

      const getMetrics = (t) => {
        const db = t.spans.filter(s => s.attributes?.['db.system'] && s.attributes['db.system'] !== 'redis').reduce((a, b) => a + (b.durationMs || 0), 0);
        const redis = t.spans.filter(s => s.attributes?.['db.system'] === 'redis').reduce((a, b) => a + (b.durationMs || 0), 0);
        const ext = t.spans.filter(s => (s.attributes?.['component'] === 'fetch' || (s.kind === 'CLIENT' && !s.attributes?.['db.system'])) && s.spanId !== t.rootSpanId).reduce((a, b) => a + (b.durationMs || 0), 0);
        const compute = Math.max(0.5, (t.durationMs || 0) - db - ext);
        return { db, redis, ext, compute };
      };

      const mA = getMetrics(traceA);
      const mB = getMetrics(traceB);

      let html = \`
        <!-- High Level Delta Banner -->
        <div class="p-5 rounded-2xl bg-gray-900/80 border \${isFaster ? 'border-emerald-500/40 glow-emerald' : 'border-rose-500/40 glow-rose'} flex items-center justify-between shadow-2xl">
          <div class="space-y-1">
            <span class="text-xs text-gray-400 font-mono uppercase tracking-wider">OVERALL LATENCY DELTA</span>
            <div class="text-3xl font-extrabold font-mono flex items-center space-x-3">
              <span class="\${isFaster ? 'text-emerald-400' : 'text-rose-400'}">\${deltaMs <= 0 ? '' : '+'}\${deltaMs} ms</span>
              <span class="text-xs px-2.5 py-1 rounded-full font-bold \${isFaster ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                \${isFaster ? '🚀 ' : '⚠️ '}\${Math.abs(deltaPercent)}% \${isFaster ? 'FASTER' : 'SLOWER'}
              </span>
            </div>
            <div class="text-xs text-gray-400 font-mono">
              Baseline (A): <b class="text-gray-200">\${durA}ms</b> ➔ Target (B): <b class="text-gray-200">\${durB}ms</b>
            </div>
          </div>

          <div class="text-right font-mono text-xs space-y-1 text-gray-400">
            <div>Spans: <b>\${traceA.spans.length}</b> ➔ <b>\${traceB.spans.length}</b></div>
            <div>Status: <span class="text-emerald-400 font-bold">\${traceA.http?.statusCode || 200}</span> ➔ <span class="text-emerald-400 font-bold">\${traceB.http?.statusCode || 200}</span></div>
          </div>
        </div>

        <!-- Category Comparison Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div class="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <div class="text-gray-400">Database I/O</div>
            <div class="text-base font-bold text-gray-200">\${mA.db.toFixed(1)}ms ➔ \${mB.db.toFixed(1)}ms</div>
            <div class="text-[11px] \${(mB.db - mA.db) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}">
              Δ \${(mB.db - mA.db).toFixed(1)}ms (\${mA.db > 0 ? (((mB.db - mA.db) / mA.db) * 100).toFixed(0) : 0}%)
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <div class="text-gray-400">External Microservices</div>
            <div class="text-base font-bold text-gray-200">\${mA.ext.toFixed(1)}ms ➔ \${mB.ext.toFixed(1)}ms</div>
            <div class="text-[11px] \${(mB.ext - mA.ext) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}">
              Δ \${(mB.ext - mA.ext).toFixed(1)}ms (\${mA.ext > 0 ? (((mB.ext - mA.ext) / mA.ext) * 100).toFixed(0) : 0}%)
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <div class="text-gray-400">Self Compute / Logic</div>
            <div class="text-base font-bold text-gray-200">\${mA.compute.toFixed(1)}ms ➔ \${mB.compute.toFixed(1)}ms</div>
            <div class="text-[11px] \${(mB.compute - mA.compute) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}">
              Δ \${(mB.compute - mA.compute).toFixed(1)}ms
            </div>
          </div>
        </div>

        <!-- Span by Span Breakdown Table -->
        <div class="space-y-2">
          <div class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">SPAN-BY-SPAN DETAILED COMPARISON</div>
          <div class="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden font-mono text-xs">
            <div class="grid grid-cols-12 gap-2 p-2.5 bg-gray-950 text-gray-400 font-semibold border-b border-gray-800">
              <div class="col-span-6">SPAN NAME</div>
              <div class="col-span-2 text-right">TRACE A</div>
              <div class="col-span-2 text-right">TRACE B</div>
              <div class="col-span-2 text-right">DELTA (Δ)</div>
            </div>
            <div class="divide-y divide-gray-800/60 max-h-64 overflow-y-auto">
              \${traceA.spans.map(sA => {
                const sB = traceB.spans.find(s => s.name === sA.name);
                const durAVal = sA.durationMs || 0;
                const durBVal = sB ? (sB.durationMs || 0) : 0;
                const sDelta = sB ? Number((durBVal - durAVal).toFixed(1)) : -durAVal;
                const sFaster = sDelta <= 0;

                return \`
                  <div class="grid grid-cols-12 gap-2 p-2.5 hover:bg-gray-900/80 items-center">
                    <div class="col-span-6 truncate font-medium text-gray-200" title="\${sA.name}">\${sA.name}</div>
                    <div class="col-span-2 text-right text-gray-400">\${durAVal}ms</div>
                    <div class="col-span-2 text-right \${sB ? 'text-gray-200' : 'text-gray-600'}">\${sB ? \`\${durBVal}ms\` : 'N/A'}</div>
                    <div class="col-span-2 text-right font-bold \${sFaster ? 'text-emerald-400' : 'text-rose-400'}">
                      \${sDelta <= 0 ? '' : '+'}\${sDelta}ms
                    </div>
                  </div>
                \`;
              }).join('')}
            </div>
          </div>
        </div>
      \`;

      diffContentBody.innerHTML = html;
    }

    function getKindBadge(kind) {
      const colors = {
        SERVER: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        CLIENT: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        INTERNAL: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        PRODUCER: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        CONSUMER: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      };
      return colors[kind] || 'bg-gray-800 text-gray-300 border border-gray-700';
    }

    function openInspectorModal(span) {
      currentInspectedSpan = span;
      const isError = span.status?.code === 'ERROR';
      modalIcon.innerText = isError ? '⚠️' : '🔍';
      modalSpanHeader.innerHTML = \`
        <span class="truncate">\${span.name}</span>
        <span class="text-[10px] px-2 py-0.5 rounded \${getKindBadge(span.kind)}">\${span.kind} • \${span.durationMs}ms</span>
      \`;

      // SQL detection & syntax highlighting
      const dbSystem = span.attributes?.['db.system'];
      const dbStatement = span.attributes?.['db.statement'] || (span.name.startsWith('db.') ? span.name : null);
      if (dbSystem || (dbStatement && typeof dbStatement === 'string' && (dbStatement.toLowerCase().includes('select') || dbStatement.toLowerCase().includes('insert') || dbStatement.toLowerCase().includes('update') || dbStatement.toLowerCase().includes('delete') || dbStatement.toLowerCase().includes('find')))) {
        const sqlText = dbStatement || span.name;
        modalSqlCode.innerHTML = formatAndHighlightSql(sqlText);
        modalSqlSection.classList.remove('hidden');
        currentInspectedSql = sqlText;
      } else {
        modalSqlSection.classList.add('hidden');
        currentInspectedSql = null;
      }

      modalSpanStatus.innerHTML = \`
        <div class="font-bold \${isError ? 'text-rose-400' : 'text-emerald-400'}">\${span.status?.code || 'UNSET'}</div>
        <div class="text-gray-300 mt-1">\${span.status?.message || 'Execution completed without unhandled errors.'}</div>
      \`;
      modalSpanAttributes.innerText = JSON.stringify(span.attributes || {}, null, 2);
      inspectorModal.classList.remove('hidden');
    }

    window.openSpanModal = function(spanId) {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;
      const span = trace.spans.find(s => s.spanId === spanId);
      if (span) openInspectorModal(span);
    };

    window.openServiceDrawer = function(serviceName) {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;

      const isPrimary = (serviceName === (trace.serviceName || 'Express App') || serviceName === 'Order Service');
      const serviceSpans = trace.spans.filter(s => {
        if (isPrimary) {
          return !s.serviceName || s.serviceName === trace.serviceName || s.serviceName === 'Order Service';
        }
        return s.serviceName === serviceName;
      });

      const totalServiceTime = isPrimary ? trace.durationMs : (serviceSpans[0]?.durationMs || 15);
      
      // Phân loại spans nội bộ
      const middlewareSpans = serviceSpans.filter(s => 
        s.attributes?.['express.component'] === 'middleware' || 
        s.attributes?.['express.component'] === 'error_middleware' ||
        s.name.toLowerCase().includes('middleware') ||
        s.name === 'corsMiddleware' ||
        s.name === 'authMiddleware'
      );

      const stepSpans = serviceSpans.filter(s => 
        s.attributes?.['component'] === 'business_step' ||
        (s.kind === 'INTERNAL' && !s.attributes?.['express.component'] && s.spanId !== trace.rootSpanId && !middlewareSpans.includes(s))
      );

      const dbSpans = serviceSpans.filter(s => s.attributes?.['db.system'] && s.attributes['db.system'] !== 'redis');
      const redisSpans = serviceSpans.filter(s => s.attributes?.['db.system'] === 'redis');
      const externalSpans = serviceSpans.filter(s => 
        (s.attributes?.['component'] === 'fetch' || (s.kind === 'CLIENT' && !s.attributes?.['db.system'])) &&
        s.spanId !== trace.rootSpanId
      );

      const totalIoTime = [...dbSpans, ...redisSpans, ...externalSpans].reduce((sum, s) => sum + (s.durationMs || 0), 0);
      const totalMiddlewareTime = middlewareSpans.reduce((sum, s) => sum + (s.durationMs || 0), 0);
      const totalStepTime = stepSpans.reduce((sum, s) => sum + (s.durationMs || 0), 0);
      const selfComputeTime = Math.max(0.5, Number((totalServiceTime - totalIoTime).toFixed(1)));

      const computePercent = Math.min(100, Math.max(5, (selfComputeTime / totalServiceTime) * 100));
      const ioPercent = Math.max(0, 100 - computePercent);

      drawerServiceName.innerText = serviceName;
      drawerServiceIcon.innerText = serviceName.toLowerCase().includes('fastify') ? '⚡' : isPrimary ? '🚀' : '📦';
      drawerTotalDuration.innerText = \`\${totalServiceTime} ms\`;

      let bodyHtml = \`
        <!-- High-level Latency Decomposition -->
        <div class="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3 font-mono shadow-lg">
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-400 font-bold uppercase tracking-wider">LATENCY DECOMPOSITION</span>
            <span class="text-indigo-400 font-bold">\${totalServiceTime} ms total</span>
          </div>
          
          <!-- Stacked Bar -->
          <div class="w-full bg-gray-950 rounded-full h-3 overflow-hidden flex border border-gray-800">
            <div title="Compute & Logic: \${selfComputeTime}ms" class="bg-gradient-to-r from-indigo-500 to-violet-500 h-full" style="width: \${computePercent}%;"></div>
            <div title="I/O & Downstream Calls: \${totalIoTime.toFixed(1)}ms" class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full" style="width: \${ioPercent}%;"></div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-[11px] pt-1 border-t border-gray-800/60">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded bg-indigo-500 shrink-0"></span>
              <div class="truncate">
                <div class="text-gray-400">Self Compute / Logic</div>
                <div class="font-bold text-indigo-300">\${selfComputeTime} ms (\${computePercent.toFixed(0)}%)</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0"></span>
              <div class="truncate">
                <div class="text-gray-400">Downstream I/O Wait</div>
                <div class="font-bold text-emerald-300">\${totalIoTime.toFixed(1)} ms (\${ioPercent.toFixed(0)}%)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4-Phase Chronological Execution Pipeline -->
        <div class="space-y-4 pt-1">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">CHRONOLOGICAL EXECUTION PIPELINE</h3>
            <span class="text-[10px] font-mono text-gray-500">Auto-Decomposed</span>
          </div>

          <!-- STAGE 1: Ingestion & Middlewares -->
          <div class="relative pl-6 pb-2 border-l-2 border-indigo-500/40 space-y-2">
            <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-gray-950 flex items-center justify-center text-[8px] text-white font-bold">1</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-indigo-300 uppercase font-mono">Stage 1: Ingestion & Middlewares</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">\${totalMiddlewareTime.toFixed(1)}ms</span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">Zero-Config Patch</span>
            </div>
            
            \${middlewareSpans.length > 0 ? \`
              <div class="space-y-1.5 mt-2">
                \${middlewareSpans.map(s => \`
                  <div onclick="openSpanModal('\${s.spanId}')" class="p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between cursor-pointer transition text-xs font-mono group">
                    <div class="flex items-center space-x-2 truncate">
                      <span class="text-emerald-400">🛡️</span>
                      <span class="text-gray-200 group-hover:text-indigo-300 font-medium truncate">\${s.name}</span>
                    </div>
                    <div class="flex items-center space-x-2 shrink-0">
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">OK</span>
                      <span class="text-indigo-400 font-bold">\${s.durationMs}ms</span>
                    </div>
                  </div>
                \`).join('')}
              </div>
            \` : \`
              <div class="p-2.5 bg-gray-900/40 border border-dashed border-gray-800 rounded-lg text-xs font-mono text-gray-500">
                Direct route execution (No custom middleware intercepted)
              </div>
            \`}
          </div>

          <!-- STAGE 2: Business Logic & Controller Steps -->
          <div class="relative pl-6 pb-2 border-l-2 border-violet-500/40 space-y-2">
            <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-violet-600 border-2 border-gray-950 flex items-center justify-center text-[8px] text-white font-bold">2</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-violet-300 uppercase font-mono">Stage 2: Business Logic & Controller</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 font-mono border border-violet-500/20">\${totalStepTime.toFixed(1)}ms</span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">Controller Scope</span>
            </div>

            \${stepSpans.length > 0 ? \`
              <div class="space-y-1.5 mt-2">
                \${stepSpans.map(s => \`
                  <div onclick="openSpanModal('\${s.spanId}')" class="p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-violet-500/30 rounded-lg flex items-center justify-between cursor-pointer transition text-xs font-mono group">
                    <div class="flex items-center space-x-2 truncate">
                      <span class="text-violet-400">⚡</span>
                      <span class="text-gray-200 group-hover:text-violet-300 font-medium truncate">\${s.name}</span>
                    </div>
                    <div class="flex items-center space-x-2 shrink-0">
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-semibold">STEP</span>
                      <span class="text-violet-300 font-bold">\${s.durationMs}ms</span>
                    </div>
                  </div>
                \`).join('')}
              </div>
            \` : \`
              <div class="p-2.5 bg-gray-900/40 border border-dashed border-gray-800 rounded-lg text-xs font-mono text-gray-500">
                Core route handler execution (Tip: Dùng <code class="text-indigo-400">tracelens.step('tên_bước', async () => ...)</code> để bóc tách từng chặng)
              </div>
            \`}
          </div>

          <!-- STAGE 3: Outbound I/O Operations -->
          <div class="relative pl-6 pb-2 border-l-2 border-emerald-500/40 space-y-2">
            <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-gray-950 flex items-center justify-center text-[8px] text-white font-bold">3</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-emerald-300 uppercase font-mono">Stage 3: Outbound I/O Operations</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">\${totalIoTime.toFixed(1)}ms</span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">\${dbSpans.length + redisSpans.length + externalSpans.length} I/O calls</span>
            </div>

            <div class="space-y-1.5 mt-2">
              \${redisSpans.map(s => \`
                <div onclick="openSpanModal('\${s.spanId}')" class="p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-amber-500/30 rounded-lg flex items-center justify-between cursor-pointer transition text-xs font-mono group">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-amber-400">⚡</span>
                    <span class="text-gray-200 group-hover:text-amber-300 font-medium truncate">\${s.name}</span>
                  </div>
                  <div class="flex items-center space-x-2 shrink-0">
                    <span class="text-[10px] px-1.5 py-0.2 rounded \${s.attributes?.['cache.hit'] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                      \${s.attributes?.['cache.hit'] ? 'CACHE HIT' : 'CACHE MISS'}
                    </span>
                    <span class="text-amber-400 font-bold">\${s.durationMs}ms</span>
                  </div>
                </div>
              \`).join('')}

              \${externalSpans.map(s => \`
                <div onclick="openSpanModal('\${s.spanId}')" class="p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-cyan-500/30 rounded-lg flex items-center justify-between cursor-pointer transition text-xs font-mono group">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-cyan-400">🌐</span>
                    <span class="text-gray-200 group-hover:text-cyan-300 font-medium truncate">\${s.name}</span>
                  </div>
                  <div class="flex items-center space-x-2 shrink-0">
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">HTTP</span>
                    <span class="text-cyan-400 font-bold">\${s.durationMs}ms</span>
                  </div>
                </div>
              \`).join('')}

              \${dbSpans.map(s => \`
                <div onclick="openSpanModal('\${s.spanId}')" class="p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-emerald-500/30 rounded-lg flex items-center justify-between cursor-pointer transition text-xs font-mono group">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-emerald-400">🗄️</span>
                    <span class="text-gray-200 group-hover:text-emerald-300 font-medium truncate">\${s.name}</span>
                  </div>
                  <div class="flex items-center space-x-2 shrink-0">
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">QUERY</span>
                    <span class="text-emerald-400 font-bold">\${s.durationMs}ms</span>
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>

          <!-- STAGE 4: Serialization & Response Delivery -->
          <div class="relative pl-6 space-y-2">
            <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center text-[8px] text-white font-bold">4</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-emerald-400 uppercase font-mono">Stage 4: Serialization & Response Delivery</span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">HTTP Status</span>
            </div>
            
            <div class="p-2.5 bg-gray-900/60 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs font-mono">
              <div class="flex items-center space-x-2">
                <span class="text-emerald-400 font-bold">✓</span>
                <span class="text-gray-200">HTTP Response Transmitted to Client</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">\${trace.http?.statusCode || 200} \${trace.status?.code || 'OK'}</span>
              </div>
            </div>
          </div>
        </div>
      \`;

      drawerBody.innerHTML = bodyHtml;
      serviceDrawerBackdrop.classList.remove('hidden');
      serviceDrawer.classList.remove('translate-x-full');
    };

    errorAlertBanner.style.cursor = 'pointer';
    errorAlertBanner.addEventListener('click', () => {
      const trace = traces.find(t => t.id === selectedTraceId);
      if (!trace) return;
      const errSpan = trace.spans.find(s => s.status?.code === 'ERROR') || trace.spans[0];
      if (errSpan) openInspectorModal(errSpan);
    });

    function renderWaterfall(trace) {
      const totalTime = Math.max(0.1, trace.durationMs);
      const startTime = trace.timestamp;

      spansContainer.innerHTML = trace.spans.map(span => {
        const offset = Math.max(0, span.startTime - startTime);
        const leftPercent = Math.min(95, (offset / totalTime) * 100);
        const widthPercent = Math.max(2, (span.durationMs / totalTime) * 100);
        const isRoot = span.spanId === trace.rootSpanId;
        const isSpanError = span.status?.code === 'ERROR';

        return \`
          <div onclick="openSpanModal('\${span.spanId}')" class="flex items-center text-xs font-mono hover:bg-gray-900/70 p-2 rounded cursor-pointer border transition \${isSpanError ? 'border-rose-500/40 bg-rose-950/20' : 'border-gray-800/40'}">
            <div class="w-1/3 truncate flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full \${isSpanError ? 'bg-rose-400 animate-ping' : isRoot ? 'bg-indigo-400' : 'bg-emerald-400'}"></span>
              <span class="text-gray-200 font-medium \${!isRoot ? 'pl-3' : ''}">\${span.name}</span>
            </div>
            <div class="w-24 text-right text-indigo-300 font-semibold">\${span.durationMs} ms</div>
            <div class="flex-1 pl-6">
              <div class="w-full bg-gray-900/80 rounded-full h-3 overflow-hidden relative border border-gray-800">
                <div class="h-full rounded-full bg-gradient-to-r \${isSpanError ? 'from-rose-600 to-red-400' : isRoot ? 'from-indigo-600 to-violet-500' : 'from-emerald-600 to-teal-400'}" style="margin-left: \${leftPercent}%; width: \${widthPercent}%;"></div>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    /**
     * Render Hierarchical Flame Graph & Span Call Tree
     */
    function renderFlamegraph(trace) {
      const totalTime = Math.max(0.1, trace.durationMs);
      const spanMap = new Map();
      const childrenMap = new Map();

      trace.spans.forEach(s => {
        spanMap.set(s.spanId, s);
        const parentKey = s.parentSpanId || 'root';
        if (!childrenMap.has(parentKey)) {
          childrenMap.set(parentKey, []);
        }
        childrenMap.get(parentKey).push(s);
      });

      function renderNode(span, depth = 0) {
        const isError = span.status?.code === 'ERROR';
        const children = childrenMap.get(span.spanId) || [];
        const percent = Math.min(100, Math.max(1, (span.durationMs / totalTime) * 100));
        const indentPx = depth * 20;

        let icon = '⚡';
        const sys = span.attributes?.['db.system'];
        if (sys === 'postgresql') icon = '🐘';
        else if (sys === 'redis') icon = '🔴';
        else if (sys === 'mysql') icon = '🐬';
        else if (span.attributes?.['component'] === 'fetch' || span.attributes?.['component'] === 'node:http') icon = '🌐';
        else if (span.kind === 'CONSUMER' || span.attributes?.['messaging.system']) icon = '📬';

        let html = \`
          <div onclick="openSpanModal('\${span.spanId}')" class="group cursor-pointer hover:bg-gray-900/80 p-2.5 rounded-lg border transition \${isError ? 'border-rose-500/40 bg-rose-950/20' : 'border-gray-800/40 bg-gray-950/40'}" style="margin-left: \${indentPx}px">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-sm">\${icon}</span>
                <span class="font-bold text-gray-200 truncate group-hover:text-indigo-300 transition">\${span.name}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded font-mono \${getKindBadge(span.kind)}">\${span.kind}</span>
              </div>
              <div class="flex items-center space-x-3 shrink-0">
                <span class="text-[11px] font-mono text-gray-400 font-semibold">\${span.durationMs}ms (\${percent.toFixed(0)}%)</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-bold \${isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}">\${span.status?.code || 'OK'}</span>
              </div>
            </div>
            <div class="mt-1.5 w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800/80">
              <div class="h-full rounded-full bg-gradient-to-r \${isError ? 'from-rose-600 to-red-400' : span.kind === 'CLIENT' ? 'from-emerald-500 to-teal-400' : span.kind === 'CONSUMER' ? 'from-cyan-500 to-blue-400' : 'from-indigo-600 to-violet-500'}" style="width: \${percent}%;"></div>
            </div>
          </div>
        \`;

        for (const child of children) {
          html += renderNode(child, depth + 1);
        }
        return html;
      }

      const rootSpans = trace.spans.filter(s => !s.parentSpanId || !spanMap.has(s.parentSpanId));
      flamegraphContainer.innerHTML = (rootSpans.length > 0 ? rootSpans.map(s => renderNode(s, 0)).join('') : '<div class="text-gray-500">No spans recorded</div>');
    }

    /**
     * Tự động sinh Bản đồ Topology (Client -> Primary Service -> Microservice B -> DB / Redis)
     */
    function renderTopology(trace) {
      const primaryService = trace.serviceName || 'Express API';
      const isTraceError = (trace.http?.statusCode || 200) >= 400 || trace.status?.code === 'ERROR';
      
      const secondaryServicesMap = new Map();
      trace.spans.forEach(s => {
        if (s.serviceName && s.serviceName !== primaryService) {
          if (!secondaryServicesMap.has(s.serviceName)) secondaryServicesMap.set(s.serviceName, []);
          secondaryServicesMap.get(s.serviceName).push(s);
        }
      });
      const secondaryServices = Array.from(secondaryServicesMap.entries()).map(([name, spans]) => ({
        name,
        spans,
        duration: spans[0]?.durationMs || 15,
        isFastify: name.toLowerCase().includes('fastify'),
      }));

      const dbSpans = trace.spans.filter(s => s.attributes?.['db.system'] && s.attributes['db.system'] !== 'redis');
      const redisSpans = trace.spans.filter(s => s.attributes?.['db.system'] === 'redis');
      const externalSpans = trace.spans.filter(s => (s.attributes?.['component'] === 'fetch' || s.kind === 'CLIENT' && !s.attributes?.['db.system']) && !s.serviceName?.includes('Microservice'));

      let downstreamHtml = '';
      const downstreamCount = (dbSpans.length > 0 ? 1 : 0) + (redisSpans.length > 0 ? 1 : 0) + (externalSpans.length > 0 ? 1 : 0);

      if (downstreamCount === 0 && !secondaryServiceName) {
        downstreamHtml = \`
          <div class="p-4 rounded-xl border border-dashed border-gray-800 text-gray-500 text-center text-xs w-64 bg-gray-950/20">
            Request này không gọi thêm Database, Cache hoặc External API nào.
          </div>
        \`;
      } else {
        downstreamHtml = \`
          <div class="flex flex-col space-y-4">
            \${dbSpans.length > 0 ? \`
              <div class="bg-gray-900/80 border border-emerald-500/30 rounded-xl p-4 shadow-xl glow-emerald min-w-[280px]">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-xl">🗄️</span>
                    <div>
                      <div class="font-bold text-xs text-emerald-400 uppercase tracking-wide">
                        \${dbSpans[0].attributes?.['db.system'] === 'postgresql' ? 'PostgreSQL' : dbSpans[0].attributes?.['db.system'] === 'prisma' ? 'Prisma ORM' : dbSpans[0].attributes?.['db.system'] || 'Database'}
                      </div>
                      <div class="text-[11px] text-gray-400">\${dbSpans.length} query executed</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono font-bold text-emerald-300">\${dbSpans.reduce((a,c) => a + c.durationMs, 0).toFixed(1)}ms</span>
                </div>
                <div class="space-y-1 mt-2 text-[11px] font-mono text-gray-300 border-t border-gray-800/80 pt-2 max-h-24 overflow-y-auto">
                  \${dbSpans.map(s => \`
                    <div class="truncate text-gray-400" title="\${s.attributes?.['db.statement'] || s.name}">
                      • \${s.name} <span class="text-emerald-500">(\${s.durationMs}ms)</span>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            \${redisSpans.length > 0 ? \`
              <div class="bg-gray-900/80 border border-amber-500/30 rounded-xl p-4 shadow-xl glow-amber min-w-[280px]">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-xl">⚡</span>
                    <div>
                      <div class="font-bold text-xs text-amber-400 uppercase tracking-wide">Redis Cache</div>
                      <div class="text-[11px] text-gray-400">\${redisSpans.length} commands</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono font-bold text-amber-300">\${redisSpans.reduce((a,c) => a + c.durationMs, 0).toFixed(1)}ms</span>
                </div>
                <div class="space-y-1 mt-2 text-[11px] font-mono text-gray-300 border-t border-gray-800/80 pt-2">
                  \${redisSpans.map(s => \`
                    <div class="flex items-center justify-between text-gray-400">
                      <span class="truncate">• \${s.name}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded \${s.attributes?.['cache.hit'] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                        \${s.attributes?.['cache.hit'] ? 'HIT' : 'MISS'}
                      </span>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            \${externalSpans.length > 0 ? \`
              <div class="bg-gray-900/80 border border-cyan-500/30 rounded-xl p-4 shadow-xl glow-cyan min-w-[280px]">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-xl">🌐</span>
                    <div>
                      <div class="font-bold text-xs text-cyan-400 uppercase tracking-wide">External Services</div>
                      <div class="text-[11px] text-gray-400">\${externalSpans.length} outgoing calls</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono font-bold text-cyan-300">\${externalSpans.reduce((a,c) => a + c.durationMs, 0).toFixed(1)}ms</span>
                </div>
                <div class="space-y-1 mt-2 text-[11px] font-mono text-gray-300 border-t border-gray-800/80 pt-2">
                  \${externalSpans.map(s => \`
                    <div class="truncate text-gray-400" title="\${s.attributes?.['http.url'] || s.name}">
                      • \${s.name} <span class="text-cyan-400">(\${s.durationMs}ms)</span>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}
          </div>
        \`;
      }

      const clientMeta = trace.http?.client;
      const clientTitle = clientMeta?.component || clientMeta?.service || 'Client';
      const clientSubtitle = clientMeta?.action ? 'Action: ' + clientMeta.action : (trace.http?.clientIp || '127.0.0.1');
      const isBrowserClient = Boolean(clientMeta);

      topologyCanvas.innerHTML = \`
        <div class="flex items-center justify-between w-full relative z-10 px-6">
          <!-- Node 1: Client (Browser / React / Generic) -->
          <div class="flex flex-col items-center shrink-0">
            <div class="w-24 h-24 rounded-2xl \${isBrowserClient ? 'bg-violet-950/70 border-2 border-violet-500/60 glow-indigo' : 'bg-indigo-950/60 border border-indigo-500/40 glow-indigo'} flex flex-col items-center justify-center text-center p-2 shadow-2xl transition hover:scale-105">
              <span class="text-2xl mb-1">\${isBrowserClient ? '⚛️' : '💻'}</span>
              <span class="text-[11px] font-bold \${isBrowserClient ? 'text-violet-300' : 'text-indigo-300'} uppercase truncate max-w-[80px]">\${clientTitle}</span>
              \${isBrowserClient ? '<span class="text-[9px] px-1 rounded bg-violet-500/20 text-violet-300 mt-0.5 font-mono">React UI</span>' : ''}
            </div>
            <span class="text-[10px] font-mono text-gray-400 mt-2 truncate max-w-[100px] text-center" title="\${clientSubtitle}">\${clientSubtitle}</span>
          </div>

          <!-- Flow Arrow 1 -->
          <div class="flex-1 flex flex-col items-center px-3">
            <div class="w-full flex items-center">
              <div class="h-0.5 flex-1 bg-gradient-to-r \${isBrowserClient ? 'from-violet-500 to-indigo-400' : 'from-indigo-500 to-indigo-400'} relative">
                <div class="absolute inset-0 bg-white/40 flow-line"></div>
              </div>
              <span class="text-indigo-400 text-sm font-bold">►</span>
            </div>
            <span class="text-[10px] font-mono text-indigo-300 mt-1 font-semibold">\${trace.http?.method || 'GET'} \${trace.http?.path || ''}</span>
          </div>

          <!-- Node 2: Primary Microservice (Express A) -->
          <div class="flex flex-col items-center shrink-0">
            <div onclick="openServiceDrawer('\${primaryService}')" class="w-28 h-28 rounded-2xl bg-gray-900 border-2 \${isTraceError ? 'border-rose-500 glow-rose' : 'border-indigo-500 glow-indigo'} flex flex-col items-center justify-center text-center p-3 shadow-2xl cursor-pointer transition-all duration-200 hover:scale-105 hover:border-indigo-300 hover:shadow-indigo-500/25 group relative" title="Click to inspect internal execution flow">
              <span class="text-3xl mb-1 group-hover:scale-110 transition-transform">\${isTraceError ? '💥' : '🚀'}</span>
              <span class="text-xs font-bold text-white uppercase tracking-tight truncate max-w-[90px]">\${primaryService}</span>
              <span class="text-[10px] font-mono \${isTraceError ? 'text-rose-400 font-extrabold' : 'text-indigo-400 font-bold'} mt-1">\${trace.durationMs} ms</span>
              
              <!-- Drilldown badge indicator -->
              <div class="absolute -bottom-2.5 px-2 py-0.5 rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white text-[9px] font-mono font-bold tracking-tight shadow-lg shadow-indigo-600/40 flex items-center space-x-1 transition border border-indigo-400/40">
                <span>🔍</span><span>DEEP DIVE</span>
              </div>
            </div>
            <span class="text-[10px] font-mono text-gray-400 mt-4">API Gateway / App</span>
          </div>

          \${secondaryServices.map(sec => \`
            <!-- Flow Arrow Inter-Service -->
            <div class="flex-1 flex flex-col items-center px-2">
              <div class="w-full flex items-center">
                <div class="h-0.5 flex-1 bg-gradient-to-r \${sec.isFastify ? 'from-indigo-400 to-cyan-400' : 'from-indigo-400 to-amber-400'} relative">
                  <div class="absolute inset-0 bg-white/40 flow-line"></div>
                </div>
                <span class="\${sec.isFastify ? 'text-cyan-400' : 'text-amber-400'} text-xs font-bold">►</span>
              </div>
              <span class="text-[9px] font-mono \${sec.isFastify ? 'text-cyan-300' : 'text-amber-300'} mt-0.5 font-semibold">W3C HTTP</span>
            </div>

            <!-- Node Secondary Microservice -->
            <div class="flex flex-col items-center shrink-0">
              <div onclick="openServiceDrawer('\${sec.name}')" class="w-24 h-24 rounded-2xl bg-gray-900 border-2 \${sec.isFastify ? 'border-cyan-500 glow-cyan' : 'border-amber-500 glow-amber'} flex flex-col items-center justify-center text-center p-2 shadow-2xl cursor-pointer transition-all duration-200 hover:scale-105 hover:border-white/50 group relative" title="Click to inspect internal execution flow">
                <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">\${sec.isFastify ? '⚡' : '📦'}</span>
                <span class="text-[11px] font-bold text-white uppercase tracking-tight truncate max-w-[80px]" title="\${sec.name}">\${sec.name}</span>
                <span class="text-[10px] font-mono \${sec.isFastify ? 'text-cyan-400' : 'text-amber-400'} font-bold mt-0.5">\${sec.duration} ms</span>

                <div class="absolute -bottom-2.5 px-2 py-0.5 rounded-full bg-gray-800 group-hover:bg-indigo-600 text-gray-300 group-hover:text-white text-[8px] font-mono font-bold shadow flex items-center space-x-1 border border-gray-700 transition">
                  <span>🔍</span><span>DIVE</span>
                </div>
              </div>
              <span class="text-[9px] font-mono text-gray-400 mt-4">\${sec.isFastify ? 'Fastify Service' : 'Express Service'}</span>
            </div>
          \`).join('')}


          <!-- Flow Arrow 2 -->
          <div class="flex-1 flex flex-col items-center px-3 \${downstreamCount === 0 ? 'opacity-30' : ''}">
            <div class="w-full flex items-center">
              <div class="h-0.5 flex-1 bg-gradient-to-r from-indigo-400 via-teal-400 to-emerald-400 relative">
                <div class="absolute inset-0 bg-white/40 flow-line"></div>
              </div>
              <span class="text-emerald-400 text-sm font-bold">►</span>
            </div>
            <span class="text-[10px] font-mono text-gray-400 mt-1">I/O Calls</span>
          </div>

          <!-- Node 3: Downstream Services (DB / Redis / External) -->
          <div class="flex flex-col items-center shrink-0">
            \${downstreamHtml}
          </div>
        </div>
      \`;
    }

    // Connect Server-Sent Events (SSE)
    function connectSSE() {
      const eventSource = new EventSource(ENDPOINT + '/events');

      eventSource.addEventListener('traces:init', (e) => {
        traces = JSON.parse(e.data);
        updateMetrics();
        renderTraceList();
        if (traces.length > 0 && !selectedTraceId) {
          selectTrace(traces[0].id);
        }
      });

      eventSource.addEventListener('trace:new', (e) => {
        const newTrace = JSON.parse(e.data);
        traces.unshift(newTrace);
        updateMetrics();
        renderTraceList();
        if (!selectedTraceId) {
          selectTrace(newTrace.id);
        }
      });

      eventSource.addEventListener('trace:clear', () => {
        traces = [];
        updateMetrics();
        renderTraceList();
      });

      eventSource.onerror = () => {
        document.getElementById('connectionStatus').innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="font-medium text-rose-400">Reconnecting...</span>';
      };

      eventSource.onopen = () => {
        document.getElementById('connectionStatus').innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span class="font-medium text-emerald-400">Live Stream</span>';
      };
    }

    connectSSE();
  </script>
</body>
</html>`;
}
