document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const errorMessage = document.getElementById('error-message');
    const themeSelect = document.getElementById('theme-select');
    const btnOpen = document.getElementById('btn-open');
    const btnSave = document.getElementById('btn-save');
    const btnExportVisio = document.getElementById('btn-export-visio');
    const btnExportSvg = document.getElementById('btn-export-svg');
    const btnExportPng = document.getElementById('btn-export-png');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const btnCopyImage = document.getElementById('btn-copy-image');
    const btnToggleHistory = document.getElementById('btn-toggle-history');
    const btnNewDiagram = document.getElementById('btn-new-diagram');
    const paneHistory = document.getElementById('pane-history');
    const historyList = document.getElementById('history-list');
    const diagramTitleInput = document.getElementById('diagram-title');
    const splitterHistory = document.getElementById('splitter-history');
    const splitter = document.getElementById('splitter-1');
    const splitter2 = document.getElementById('splitter-2');
    const paneEditor = document.getElementById('pane-editor');
    const panePreview = document.querySelector('.pane-preview');
    const paneSyntax = document.getElementById('pane-syntax');
    const btnCloseSyntax = document.getElementById('btn-close-syntax');
    const syntaxContent = document.getElementById('syntax-content');
    const toast = document.getElementById('toast');
    const sampleButtonsContainer = document.getElementById('sample-buttons');
    const diagramNotes = document.getElementById('diagram-notes');
    const stickyNote = document.getElementById('sticky-note');
    const btnToggleNote = document.getElementById('btn-toggle-note');
    const stickyNoteHeader = document.querySelector('.sticky-note-header');
    
    // Config panel elements
    const btnConfig = document.getElementById('btn-config');
    const configPanel = document.getElementById('config-panel');
    const editorFontSizeInput = document.getElementById('editor-font-size');
    const btnFontIncrease = document.getElementById('btn-font-increase');
    const btnFontDecrease = document.getElementById('btn-font-decrease');
    const gitShowLabelsCheckbox = document.getElementById('git-show-labels');
    const editorToolbar = document.getElementById('editor-toolbar');

    let currentTheme = 'default';
    let editorFontSize = '14';
    let gitShowLabels = true;
    let renderTimer = null;
    let autoSaveTimer = null;
    let isResizing = false;
    let history = [];
    let currentDiagramId = null;
    
    // Default starting content if nothing exists
    const defaultDiagram = {
        id: Date.now().toString(),
        title: 'Untitled Diagram',
        code: `graph TD\n    A[Start] --> B{Is it working?}\n    B -- Yes --> C[Great!]\n    B -- No --> D[Fix it]\n    D --> B`,
        notes: '',
        date: new Date().toISOString()
    };

    // Define a basic CodeMirror mode for Mermaid
    if (CodeMirror.defineSimpleMode) {
        CodeMirror.defineSimpleMode("mermaid", {
            start: [
                {regex: /(?:graph|pie|sequenceDiagram|gantt|classDiagram|stateDiagram(?:-v2)?|journey|erDiagram|gitGraph|requirementDiagram|mindmap|timeline|sankey-beta|quadrantChart)\b/, token: "keyword"},
                {regex: /%%.*/, token: "comment"},
                {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string"},
                {regex: /(?:-->|---|-->>|-\.>|<--|--|<\|--|--o\{|--\|\{|\}\|--|o\|--)/, token: "operator"},
                {regex: /(?:title|dateFormat|section|participant|actor|note|class|state)\b/, token: "keyword"},
                {regex: /[\[\](){}]/, token: "bracket"},
                {regex: /-?0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
                {regex: /[A-Za-z_][A-Za-z0-9_]*/, token: "variable"}
            ]
        });
    }

    // Initialize CodeMirror instance
    const cmEditor = CodeMirror.fromTextArea(editor, {
        mode: "mermaid",
        lineNumbers: true,
        theme: "default",
        lineWrapping: false
    });

    function applyConfig(isInitial = false) {
        // Theme
        const body = document.body;
        if (currentTheme === 'dark') {
            body.className = 'theme-dark';
            cmEditor.setOption("theme", "monokai");
        } else {
            body.className = 'theme-default';
            cmEditor.setOption("theme", "default");
        }
        
        // Font Size
        cmEditor.getWrapperElement().style.fontSize = `${editorFontSize}px`;
        cmEditor.refresh();

        // Mermaid Initialize
        mermaid.initialize({
            startOnLoad: false,
            theme: currentTheme,
            securityLevel: 'loose',
            gitGraph: {
                showCommitLabel: gitShowLabels
            }
        });
        
        if (!isInitial) {
            localStorage.setItem('mermaid_config', JSON.stringify({
                theme: currentTheme,
                fontSize: editorFontSize,
                gitLabels: gitShowLabels
            }));
            renderDiagram();
        }
    }

    // Render diagram
    async function renderDiagram() {
        const code = cmEditor.getValue().trim();
        if (!code) {
            preview.innerHTML = '';
            hideError();
            autoSave();
            return;
        }

        try {
            // Generate unique ID for diagram
            const id = 'mermaid-' + Date.now();
            
            // Check syntax first (throws error if invalid)
            await mermaid.parse(code);
            
            // Render to SVG
            const { svg } = await mermaid.render(id, code);
            preview.innerHTML = svg;
            hideError();
            autoSave();
        } catch (error) {
            // Error handling
            console.error('Mermaid render error:', error);
            showError(error.message || error.str || 'Syntax error in diagram');
            // Still save even if there's an error so user doesn't lose work
            autoSave();
        }
    }

    // Debounced render
    function scheduleRender() {
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(renderDiagram, 500);
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // --- Editor Toolbar & Arrow Buttons ---
    const diagramArrows = {
        flowchart: [
            { label: '-->', insert: ' --> ' },
            { label: '-.->', insert: ' -.-> ' },
            { label: '==>', insert: ' ==> ' }
        ],
        sequence: [
            { label: '->>', insert: ' ->> ' },
            { label: '-->>', insert: ' -->> ' },
            { label: '-x', insert: ' -x ' }
        ],
        class: [
            { label: '<|--', insert: ' <|-- ' },
            { label: '*--', insert: ' *-- ' },
            { label: 'o--', insert: ' o-- ' }
        ],
        state: [
            { label: '-->', insert: ' --> ' },
            { label: '[*]', insert: ' [*] ' }
        ],
        er: [
            { label: '||--o{', insert: ' ||--o{ ' },
            { label: '}o--||', insert: ' }o--|| ' },
            { label: '}o..o{', insert: ' }o..o{ ' }
        ],
        default: [
            { label: '-->', insert: ' --> ' }
        ]
    };

    function getDiagramType(code) {
        const lines = code.trim().split('\n');
        for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('graph') || clean.startsWith('flowchart')) return 'flowchart';
            if (clean.startsWith('sequenceDiagram')) return 'sequence';
            if (clean.startsWith('classDiagram')) return 'class';
            if (clean.startsWith('stateDiagram')) return 'state';
            if (clean.startsWith('erDiagram')) return 'er';
            if (clean && !clean.startsWith('%%')) break; // first significant line
        }
        return 'default';
    }

    let currentDiagramType = '';
    function updateEditorToolbar(force = false) {
        if (!editorToolbar) return;
        const code = cmEditor.getValue();
        const type = getDiagramType(code);
        
        if (type === currentDiagramType && !force) return;
        currentDiagramType = type;
        
        editorToolbar.innerHTML = '';
        
        // Skip arrows for types that don't need them
        if (['git', 'mindmap', 'timeline', 'quadrantChart', 'pie', 'journey', 'sankey-beta', 'requirementDiagram'].includes(type) || type.startsWith('gitGraph')) {
            return; 
        }

        const arrows = diagramArrows[type] || diagramArrows.default;
        
        arrows.forEach(arrow => {
            const btn = document.createElement('button');
            btn.className = 'btn-arrow';
            btn.textContent = arrow.label;
            btn.title = `Insert ${arrow.label}`;
            btn.onclick = () => {
                const doc = cmEditor.getDoc();
                const cursor = doc.getCursor();
                doc.replaceRange(arrow.insert, cursor);
                cmEditor.focus();
            };
            editorToolbar.appendChild(btn);
        });
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    /* --- History Management --- */

    function saveHistory() {
        // Fallback to local storage if API isn't ready
        localStorage.setItem('mermaid_current_id', currentDiagramId);
        
        // Use python backend for persistent cross-session storage
        if (window.pywebview && window.pywebview.api) {
            const dataToSave = JSON.stringify({
                history: history,
                currentId: currentDiagramId
            });
            window.pywebview.api.save_history(dataToSave).catch(e => console.error("Error saving to backend", e));
        } else {
            localStorage.setItem('mermaid_history', JSON.stringify(history));
        }
        
        renderHistoryList();
    }

    function autoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            const currentCode = cmEditor.getValue();
            const currentTitle = diagramTitleInput.value || 'Untitled Diagram';
            const currentNotes = diagramNotes.value;
            
            let item = history.find(h => h.id === currentDiagramId);
            if (item) {
                item.code = currentCode;
                item.title = currentTitle;
                item.notes = currentNotes;
                item.date = new Date().toISOString();
            } else {
                // If somehow lost, recreate
                item = {
                    id: currentDiagramId || Date.now().toString(),
                    title: currentTitle,
                    code: currentCode,
                    notes: currentNotes,
                    date: new Date().toISOString()
                };
                currentDiagramId = item.id;
                history.unshift(item);
            }
            saveHistory();
        }, 1000);
    }

    function loadDiagram(id) {
        const item = history.find(h => h.id === id);
        if (item) {
            currentDiagramId = id;
            if (cmEditor.getValue() !== item.code) {
                cmEditor.setValue(item.code || '');
            }
            diagramTitleInput.value = item.title;
            diagramNotes.value = item.notes || '';
            updateEditorToolbar(true);
            renderDiagram();
            renderHistoryList();
        }
    }

    function createNewDiagram(initialCode = '', initialTitle = 'Untitled Diagram') {
        const newDiagram = {
            id: Date.now().toString(),
            title: initialTitle,
            code: initialCode,
            notes: '',
            date: new Date().toISOString()
        };
        history.unshift(newDiagram);
        currentDiagramId = newDiagram.id;
        cmEditor.setValue(newDiagram.code);
        diagramTitleInput.value = newDiagram.title;
        diagramNotes.value = '';
        updateEditorToolbar(true);
        renderDiagram();
        saveHistory();
        cmEditor.focus();
    }

    function deleteDiagram(id, e) {
        e.stopPropagation(); // Prevent loading the diagram when clicking delete
        
        if (!confirm('Are you sure you want to delete this diagram?')) return;
        
        history = history.filter(h => h.id !== id);
        
        if (history.length === 0) {
            history.push(defaultDiagram);
            currentDiagramId = defaultDiagram.id;
            loadDiagram(currentDiagramId);
        } else if (currentDiagramId === id) {
            currentDiagramId = history[0].id;
            loadDiagram(currentDiagramId);
        } else {
            saveHistory();
        }
    }

    function renderHistoryList() {
        historyList.innerHTML = '';
        
        // Sort by date (newest first)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        history.forEach(item => {
            const dateObj = new Date(item.date);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const el = document.createElement('div');
            el.className = `history-item ${item.id === currentDiagramId ? 'active' : ''}`;
            el.onclick = () => loadDiagram(item.id);
            
            el.innerHTML = `
                <div class="history-item-header">
                    <span class="history-title" title="${item.title}">${item.title}</span>
                    <button class="btn-delete-history" title="Delete diagram">✖</button>
                </div>
                <div class="history-date">${dateStr}</div>
            `;
            
            el.querySelector('.btn-delete-history').onclick = (e) => deleteDiagram(item.id, e);
            historyList.appendChild(el);
        });
    }

    // Initialize state
    async function initApp() {
        // Try loading from python backend first
        let loadedFromBackend = false;
        if (window.pywebview && window.pywebview.api) {
            try {
                const historyStr = await window.pywebview.api.load_history();
                if (historyStr) {
                    const data = JSON.parse(historyStr);
                    if (data && data.history && Array.isArray(data.history)) {
                        history = data.history;
                        currentDiagramId = data.currentId;
                        loadedFromBackend = true;
                    }
                }
            } catch (e) {
                console.error("Failed to load history from backend, falling back to local storage", e);
            }
        }
        
        // Fallback to local storage if backend loading failed
        if (!loadedFromBackend) {
            history = JSON.parse(localStorage.getItem('mermaid_history') || '[]');
            currentDiagramId = localStorage.getItem('mermaid_current_id');
        }

        if (history.length === 0) {
            history.push(defaultDiagram);
            currentDiagramId = defaultDiagram.id;
        } else if (!currentDiagramId || !history.find(h => h.id === currentDiagramId)) {
            currentDiagramId = history[0].id;
        }
        
        // Ensure UI elements are correctly set from storage before initial render
        const diagramToLoad = history.find(h => h.id === currentDiagramId) || history[0];
        if (cmEditor.getValue() !== diagramToLoad.code) {
            cmEditor.setValue(diagramToLoad.code || '');
        }
        diagramTitleInput.value = diagramToLoad.title || '';
        diagramNotes.value = diagramToLoad.notes || '';
        
        // Load Config
        try {
            const savedConfig = JSON.parse(localStorage.getItem('mermaid_config'));
            if (savedConfig) {
                currentTheme = savedConfig.theme || 'default';
                editorFontSize = savedConfig.fontSize || '14';
                gitShowLabels = savedConfig.gitLabels !== false;
            }
        } catch (e) {}

        themeSelect.value = currentTheme;
        editorFontSizeInput.value = editorFontSize;
        gitShowLabelsCheckbox.checked = gitShowLabels;
        
        applyConfig(true);
        updateEditorToolbar(true);
        
        renderHistoryList();
        renderDiagram();
    }

    // Samples Data
    const mermaidSamples = {
        flowchart: {
            code: `graph TD
    A[Hard edge] -->|Link text| B(Round edge)
    B --> C{Decision}
    C -->|One| D[Result one]
    C -->|Two| E[Result two]`,
            syntax: `<h3>Flowchart Syntax</h3>
<p>Nodes are defined by ID and optional text in brackets. Link types determine line style and arrows.</p>
<ul>
    <li><code>graph TD</code> (Top to Down)</li>
    <li><code>id[text]</code>: Node with rectangular shape</li>
    <li><code>id(text)</code>: Node with rounded edges</li>
    <li><code>id{text}</code>: Node with rhombus shape (Decision)</li>
    <li><code>--&gt;</code>: Arrow link</li>
    <li><code>--&gt;|text|</code>: Arrow link with text</li>
</ul>`
        },
        
        sequence: {
            code: `sequenceDiagram
    Alice->>+John: Hello John, how are you?
    Alice->>+John: John, can you hear me?
    John-->>-Alice: Hi Alice, I can hear you!
    John-->>-Alice: I feel great!`,
            syntax: `<h3>Sequence Diagram Syntax</h3>
<p>Participants and asynchronous/synchronous messages between them.</p>
<ul>
    <li><code>sequenceDiagram</code></li>
    <li><code>Participant1-&gt;&gt;Participant2: Message</code>: Solid line with arrow</li>
    <li><code>Participant1--&gt;&gt;Participant2: Message</code>: Dotted line with arrow</li>
    <li><code>+</code> and <code>-</code>: Activate and deactivate participant lifelines</li>
</ul>`
        },
        
        gantt: {
            code: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d`,
            syntax: `<h3>Gantt Chart Syntax</h3>
<p>Tracks project schedules and tasks.</p>
<ul>
    <li><code>gantt</code></li>
    <li><code>dateFormat</code>: Input format for dates</li>
    <li><code>title</code>: Chart title</li>
    <li><code>section [name]</code>: Groups tasks</li>
    <li><code>[Task name] : [id], [start], [duration]</code></li>
</ul>`
        },
        
        class: {
            code: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }`,
            syntax: `<h3>Class Diagram Syntax</h3>
<p>Describes structural relations in OO design.</p>
<ul>
    <li><code>classDiagram</code></li>
    <li><code>ClassA &lt;|-- ClassB</code>: Inheritance</li>
    <li><code>ClassA : +Type prop</code>: Public member</li>
    <li><code>ClassA : +method()</code>: Public method</li>
    <li>Use <code>class ClassName { ... }</code> for grouped definitions</li>
</ul>`
        },
        
        state: {
            code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
            syntax: `<h3>State Diagram Syntax</h3>
<p>Finite state machine flow mapping.</p>
<ul>
    <li><code>stateDiagram-v2</code></li>
    <li><code>[*]</code>: Initial / Final state</li>
    <li><code>State1 --&gt; State2</code>: Transition</li>
</ul>`
        },
        
        pie: {
            code: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
            syntax: `<h3>Pie Chart Syntax</h3>
<p>Simple relational ratio breakdown.</p>
<ul>
    <li><code>pie title [Title Name]</code></li>
    <li><code>"Label" : Value</code></li>
</ul>`
        },
        
        journey: {
            code: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go downstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go upstairs: 3: Me
      Sit down: 5: Me`,
            syntax: `<h3>User Journey Syntax</h3>
<p>Map out user experiences.</p>
<ul>
    <li><code>journey</code></li>
    <li><code>title</code>: Journey title</li>
    <li><code>section</code>: Journey stages</li>
    <li><code>[Task]: [Score]: [Actors]</code> (Score is 1-5 scale)</li>
</ul>`
        },
        
        er: {
            code: `erDiagram
    CUSTOMER }|..|{ DELIVERY-ADDRESS : has
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ INVOICE : "liable for"
    DELIVERY-ADDRESS ||--o{ ORDER : receives
    INVOICE ||--|{ ORDER : covers
    ORDER ||--|{ ORDER-ITEM : includes
    PRODUCT-CATEGORY ||--|{ PRODUCT : contains
    PRODUCT ||--o{ ORDER-ITEM : "ordered in"`,
            syntax: `<h3>Entity Relationship Syntax</h3>
<p>Describes databases or information systems.</p>
<ul>
    <li><code>erDiagram</code></li>
    <li><code>ENTITY1 relationship ENTITY2 : label</code></li>
    <li><code>||--o{</code> One-to-Zero-or-More</li>
    <li><code>||--|{</code> One-to-One-or-More</li>
    <li><code>}|..|{</code> Many-to-Many</li>
</ul>`
        },
        
        git: {
            code: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit`,
            syntax: `<h3>Git Graph Syntax</h3>
<p>Visualizes branching model and history.</p>
<ul>
    <li><code>gitGraph</code></li>
    <li><code>commit</code>: Create a new commit</li>
    <li><code>branch [name]</code>: Create a branch</li>
    <li><code>checkout [name]</code>: Switch branch</li>
    <li><code>merge [name]</code>: Merge branch into current</li>
</ul>`
        },

        requirement: {
            code: `requirementDiagram
    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }

    element test_entity {
    type: simulation
    }

    test_entity - satisfies -> test_req`,
            syntax: `<h3>Requirement Diagram Syntax</h3>
<p>SysML Requirement diagrams.</p>
<ul>
    <li><code>requirementDiagram</code></li>
    <li><code>requirement [name] { ... }</code>: Define requirement</li>
    <li><code>element [name] { ... }</code>: Define element</li>
    <li>Relationships: <code>satisfies</code>, <code>verifies</code>, <code>derives</code>, <code>refines</code></li>
</ul>`
        },

        mindmap: {
            code: `mindmap
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation
        Uses
            Creative techniques
            Strategic planning
            Argument mapping`,
            syntax: `<h3>Mindmap Syntax</h3>
<p>Visual map of hierarchical information.</p>
<ul>
    <li><code>mindmap</code></li>
    <li>Indentation determines hierarchy level</li>
    <li>Different shapes: <code>root((map))</code>, <code>[box]</code>, <code>(rounded)</code></li>
    <li>Sub-items placed indented below parent</li>
</ul>`
        },

        timeline: {
            code: `timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook
         : Google
    2005 : Youtube
    2006 : Twitter`,
            syntax: `<h3>Timeline Syntax</h3>
<p>Sequential representation of events.</p>
<ul>
    <li><code>timeline</code></li>
    <li><code>title</code>: Timeline title</li>
    <li><code>[Time period] : [Event 1] : [Event 2]</code></li>
</ul>`
        },

        sankey: {
            code: `sankey-beta
    Bio-conversion,Liquid,0.58
    Bio-conversion,Solid,0.26
    Bio-conversion,Gas,0.16`,
            syntax: `<h3>Sankey Diagram Syntax</h3>
<p>Flow diagram where arrow width is proportional to flow rate.</p>
<ul>
    <li><code>sankey-beta</code></li>
    <li><code>[Source], [Target], [Value]</code> (comma-separated)</li>
    <li>Each line represents a flow</li>
</ul>`
        },

        quadrant: {
            code: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]`,
            syntax: `<h3>Quadrant Chart Syntax</h3>
<p>Two-axis map divided into four areas.</p>
<ul>
    <li><code>quadrantChart</code></li>
    <li><code>title [Text]</code></li>
    <li><code>x-axis / y-axis [Left] --&gt; [Right]</code></li>
    <li><code>quadrant-[1-4] [Text]</code>: Define labels for 4 areas</li>
    <li><code>[Point Name]: [x, y]</code>: Plot coordinates (0 to 1)</li>
</ul>`
        }
    };

    // Event Listeners
    cmEditor.on('change', () => {
        scheduleRender();
        updateEditorToolbar(false);
    });
    diagramTitleInput.addEventListener('input', () => {
        // Auto save on title change
        autoSave();
    });
    diagramNotes.addEventListener('input', () => {
        autoSave();
    });

    // Sticky Note drag logic
    let isDraggingNote = false;
    let noteOffsetX, noteOffsetY;

    stickyNoteHeader.addEventListener('mousedown', (e) => {
        if(e.target === btnToggleNote) return; // Don't drag if clicking minimize
        isDraggingNote = true;
        const rect = stickyNote.getBoundingClientRect();
        noteOffsetX = e.clientX - rect.left;
        noteOffsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingNote) return;
        const previewRect = panePreview.getBoundingClientRect();
        
        let newLeft = e.clientX - previewRect.left - noteOffsetX;
        let newTop = e.clientY - previewRect.top - noteOffsetY;
        
        // Bounds check
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + stickyNote.offsetWidth > previewRect.width) newLeft = previewRect.width - stickyNote.offsetWidth;
        if (newTop + stickyNote.offsetHeight > previewRect.height) newTop = previewRect.height - stickyNote.offsetHeight;

        stickyNote.style.left = `${newLeft}px`;
        stickyNote.style.top = `${newTop}px`;
        stickyNote.style.right = 'auto'; // Disable default right/bottom positioning
        stickyNote.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingNote) {
            isDraggingNote = false;
        }
    });

    btnToggleNote.addEventListener('click', () => {
        stickyNote.classList.toggle('minimized');
        btnToggleNote.textContent = stickyNote.classList.contains('minimized') ? '□' : '_';
    });

    // Toggle history pane
    btnToggleHistory.addEventListener('click', () => {
        paneHistory.classList.toggle('hidden');
        splitterHistory.classList.toggle('hidden');
    });

    // New diagram button
    btnNewDiagram.addEventListener('click', createNewDiagram);

    // Initial render
    initApp();

    // Config event listeners
    themeSelect.addEventListener('change', (e) => {
        currentTheme = e.target.value;
        applyConfig();
    });

    editorFontSizeInput.addEventListener('change', (e) => {
        editorFontSize = e.target.value;
        applyConfig();
    });

    gitShowLabelsCheckbox.addEventListener('change', (e) => {
        gitShowLabels = e.target.checked;
        applyConfig();
    });

    btnFontIncrease.addEventListener('click', () => {
        let size = parseInt(editorFontSizeInput.value);
        if (size < 30) {
            size++;
            editorFontSizeInput.value = size;
            editorFontSize = size.toString();
            applyConfig();
        }
    });

    btnFontDecrease.addEventListener('click', () => {
        let size = parseInt(editorFontSizeInput.value);
        if (size > 10) {
            size--;
            editorFontSizeInput.value = size;
            editorFontSize = size.toString();
            applyConfig();
        }
    });

    // Toggle Config Panel
    btnConfig.addEventListener('click', () => {
        if (configPanel.style.display === 'none') {
            configPanel.style.display = 'flex';
            btnConfig.style.backgroundColor = 'var(--accent-color)';
            btnConfig.style.color = 'white';
        } else {
            configPanel.style.display = 'none';
            btnConfig.style.backgroundColor = '';
            btnConfig.style.color = '';
        }
    });

    // Sample loading via buttons
    sampleButtonsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-sample');
        if (!btn) return;
        
        const sampleKey = btn.getAttribute('data-sample');
        if (sampleKey && mermaidSamples[sampleKey]) {
            // Check if current diagram is empty before creating a new one
            const currentTitle = diagramTitleInput.value.trim();
            const currentCode = cmEditor.getValue().trim();
            const isEmpty = currentCode === '' || (currentTitle === 'Untitled Diagram' && currentCode === defaultDiagram.code);

            const sampleTitle = btn.textContent + ' Sample';
            
            if (isEmpty) {
                // If it's empty/default, just replace the current one
                cmEditor.setValue(mermaidSamples[sampleKey].code);
                diagramTitleInput.value = sampleTitle;
                renderDiagram();
                autoSave();
            } else {
                // Otherwise, create a new diagram for the sample
                createNewDiagram(mermaidSamples[sampleKey].code, sampleTitle);
            }
            
            // Show and populate syntax reference
            syntaxContent.innerHTML = mermaidSamples[sampleKey].syntax;
            paneSyntax.classList.remove('hidden');
            
            // Adjust editor width if it's taking up too much space now that syntax pane is open
            if(parseFloat(paneEditor.style.width) > 60) {
                paneEditor.style.width = '40%';
            }
        }
    });

    btnCloseSyntax.addEventListener('click', () => {
        paneSyntax.classList.add('hidden');
    });

    // Editor Resizing logic
    let activeSplitter = null;

    function startResizing(e, splitterId) {
        isResizing = true;
        activeSplitter = splitterId;
        document.body.style.cursor = 'col-resize';
        
        const overlay = document.createElement('div');
        overlay.id = 'resize-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '9999';
        document.body.appendChild(overlay);
    }

    if(splitterHistory) splitterHistory.addEventListener('mousedown', (e) => startResizing(e, 'splitter-history'));
    splitter.addEventListener('mousedown', (e) => startResizing(e, 'splitter-1'));
    splitter2.addEventListener('mousedown', (e) => startResizing(e, 'splitter-2'));

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerWidth = document.querySelector('.editor-container').offsetWidth;
        
        if (activeSplitter === 'splitter-history') {
            let newWidth = (e.clientX / containerWidth) * 100;
            if (newWidth < 10) newWidth = 10;
            if (newWidth > 40) newWidth = 40;
            paneHistory.style.width = `${newWidth}%`;
        } else if (activeSplitter === 'splitter-1') {
            // Adjust editor pane width. Note: clientX relative to history pane width requires calculation
            let historyWidth = paneHistory.classList.contains('hidden') ? 0 : paneHistory.getBoundingClientRect().width;
            let newWidth = ((e.clientX - historyWidth) / containerWidth) * 100;
            if (newWidth < 10) newWidth = 10;
            if (newWidth > 80) newWidth = 80;
            paneEditor.style.width = `${newWidth}%`;
        } else if (activeSplitter === 'splitter-2') {
            // Distance from right edge determines syntax pane width
            const rightEdge = document.querySelector('.editor-container').getBoundingClientRect().right;
            let newWidth = ((rightEdge - e.clientX) / containerWidth) * 100;
            if (newWidth < 10) newWidth = 10;
            if (newWidth > 50) newWidth = 50;
            paneSyntax.style.width = `${newWidth}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            activeSplitter = null;
            document.body.style.cursor = '';
            const overlay = document.getElementById('resize-overlay');
            if (overlay) overlay.remove();
        }
    });

    // Copy features
    btnCopyCode.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(cmEditor.getValue());
            showToast('Code copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy code: ', err);
            showError('Failed to copy code to clipboard');
        }
    });

    btnCopyImage.addEventListener('click', async () => {
        const svgElement = preview.querySelector('svg');
        if (!svgElement) {
            showError('No diagram to copy');
            return;
        }

        try {
            // Create canvas for PNG conversion
            const canvas = document.createElement('canvas');
            const svgSize = svgElement.getBoundingClientRect();
            
            // Higher scale for better copy quality
            const scale = 2;
            canvas.width = svgSize.width * scale;
            canvas.height = svgSize.height * scale;
            
            const ctx = canvas.getContext('2d');
            
            // Set background based on theme
            if (currentTheme === 'dark') {
                ctx.fillStyle = '#1e1e1e';
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let svgXml = new XMLSerializer().serializeToString(svgElement);
            if (!svgXml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                svgXml = svgXml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            const DOMURL = self.URL || self.webkitURL || self;
            const img = new Image();
            const svgBlob = new Blob([svgXml], {type: 'image/svg+xml;charset=utf-8'});
            const url = DOMURL.createObjectURL(svgBlob);

            img.onload = async function() {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                DOMURL.revokeObjectURL(url);
                
                canvas.toBlob(async (blob) => {
                    try {
                        const item = new ClipboardItem({ "image/png": blob });
                        await navigator.clipboard.write([item]);
                        showToast('Image copied to clipboard!');
                    } catch (err) {
                        console.error('Failed to copy image: ', err);
                        showError('Failed to copy image to clipboard. (Clipboard API might be restricted)');
                    }
                }, "image/png");
            };
            img.src = url;

        } catch (err) {
            console.error('Copy image setup error:', err);
            showError('Error preparing image for clipboard');
        }
    });

    /* --- Python API Integration --- */
    
    // Check if pywebview is available (might take a moment to inject)
    function waitForApi(callback) {
        if (window.pywebview && window.pywebview.api) {
            callback();
        } else {
            window.addEventListener('pywebviewready', callback);
        }
    }

    waitForApi(() => {
        // Initialize app state now that API is known to be ready
        initApp();
        
        const api = window.pywebview.api;

        btnSave.addEventListener('click', async () => {
            const content = cmEditor.getValue();
            const success = await api.save_file(content);
            if (success) {
                console.log('File saved successfully');
            }
        });

        btnOpen.addEventListener('click', async () => {
            const content = await api.open_file();
            if (content !== null && content !== undefined) {
                cmEditor.setValue(content);
                renderDiagram();
            }
        });

        // Visio export (same as SVG export)
        btnExportVisio.addEventListener('click', async () => {
            const svgElement = preview.querySelector('svg');
            if (!svgElement) {
                alert('No diagram to export');
                return;
            }
            
            // Clean up SVG string before exporting
            let svgXml = new XMLSerializer().serializeToString(svgElement);
            // Ensure xmlns is present if missing
            if (!svgXml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                svgXml = svgXml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            await api.save_svg(svgXml);
        });

        btnExportSvg.addEventListener('click', async () => {
            const svgElement = preview.querySelector('svg');
            if (!svgElement) {
                alert('No diagram to export');
                return;
            }
            
            // Clean up SVG string before exporting
            let svgXml = new XMLSerializer().serializeToString(svgElement);
            // Ensure xmlns is present if missing
            if (!svgXml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                svgXml = svgXml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            await api.save_svg(svgXml);
        });

        btnExportPng.addEventListener('click', () => {
            const svgElement = preview.querySelector('svg');
            if (!svgElement) {
                alert('No diagram to export');
                return;
            }

            // Create canvas for PNG export
            const canvas = document.createElement('canvas');
            const svgSize = svgElement.getBoundingClientRect();
            
            // Scale up for better resolution
            const scale = 2;
            canvas.width = svgSize.width * scale;
            canvas.height = svgSize.height * scale;
            
            const ctx = canvas.getContext('2d');
            
            // Set background based on theme (optional, otherwise transparent)
            if (document.body.className === 'theme-light' || currentTheme === 'default') {
                ctx.fillStyle = '#ffffff';
            } else if (currentTheme === 'dark') {
                ctx.fillStyle = '#1e1e1e';
            } else {
                ctx.fillStyle = '#ffffff'; // Fallback
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let svgXml = new XMLSerializer().serializeToString(svgElement);
            // Ensure xmlns is present
            if (!svgXml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                svgXml = svgXml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            const DOMURL = self.URL || self.webkitURL || self;
            const img = new Image();
            const svgBlob = new Blob([svgXml], {type: 'image/svg+xml;charset=utf-8'});
            const url = DOMURL.createObjectURL(svgBlob);

            img.onload = async function() {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                DOMURL.revokeObjectURL(url);
                
                // Get PNG string and trigger download from JS Side (simpler than sending large base64 to Python)
                const imgURI = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
                
                const evt = new MouseEvent('click', {
                    view: window,
                    bubbles: false,
                    cancelable: true
                });

                const a = document.createElement('a');
                a.setAttribute('download', 'diagram.png');
                a.setAttribute('href', imgURI);
                a.setAttribute('target', '_blank');
                a.dispatchEvent(evt);
            };
            
            img.src = url;
        });
    });
});
