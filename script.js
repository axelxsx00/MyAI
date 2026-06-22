/**
 * ==========================================================================
 * MyAI Workspace - Core System Engine
 * Versión: 3.0 (Professional & Immersive)
 * Integración: Cohere API (command-r-08-2024)
 * Funcionalidad: Gestión de Chats, Análisis de Archivos, Modo Voz, UI Dinámica
 * ==========================================================================
 */

const AppConfig = {
    COHERE_API_KEY: "tEiSQlInoBfW2U1gtSgElZaNHbookFyGzLI2Vuuz",
    COHERE_MODEL: "command-r-08-2024",
    COHERE_API_URL: "https://api.cohere.ai/v1/chat",
    MAX_TOKENS_LIMIT: 8000,
    STORAGE_KEY: "myai_chat_history_v3"
};

/**
 * ==========================================
 * 1. UTILIDADES Y PARSEADORES
 * ==========================================
 */
const Utils = {
    generateId: () => '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    
    formatDate: (dateObj) => {
        const options = { hour: '2-digit', minute: '2-digit' };
        return dateObj.toLocaleTimeString('es-ES', options);
    },
    
    formatDateFull: (dateObj) => {
        return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatBytes: (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    // Parseador ligero de Markdown a HTML para las respuestas
    parseMarkdown: (text) => {
        if (!text) return '';
        let html = text;
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            let lang = 'code';
            let cleanCode = code;
            const firstLineBreak = code.indexOf('\n');
            if (firstLineBreak !== -1 && firstLineBreak < 20) {
                lang = code.substring(0, firstLineBreak).trim() || 'code';
                cleanCode = code.substring(firstLineBreak + 1);
            }
            return `<div class="enhanced-code-block">
                <div class="code-top-bar">
                    <div class="window-controls"><span></span><span></span><span></span></div>
                    <span class="code-lang-label">${lang}</span>
                    <button class="code-copy-btn" onclick="ClipboardManager.copyCode(this)"><i class="far fa-copy"></i> Copiar</button>
                </div>
                <div class="code-scroll-area custom-scrollbar"><pre><code class="code-content">${cleanCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>
            </div>`;
        });
        
        // Inline formatting
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">$1</code>');
        
        // Lists
        html = html.replace(/^\s*-\s+(.*)$/gm, '<ul><li>$1</li></ul>');
        html = html.replace(/<\/ul>\n<ul>/g, '\n');
        
        // Paragraphs (basic)
        html = html.split('\n\n').map(p => {
            if (p.trim().startsWith('<div') || p.trim().startsWith('<ul>')) return p;
            return `<p>${p}</p>`;
        }).join('');
        
        return html;
    }
};

/**
 * ==========================================
 * 2. GESTOR DE ALMACENAMIENTO (LOCALSTORAGE)
 * ==========================================
 */
class StorageManager {
    static getChats() {
        const data = localStorage.getItem(AppConfig.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    static saveChats(chats) {
        try {
            localStorage.setItem(AppConfig.STORAGE_KEY, JSON.stringify(chats));
            this.updateStorageIndicator();
        } catch (e) {
            console.error("Error al guardar en LocalStorage. Posible cuota excedida.");
            AuraManager.setState('error');
        }
    }

    static getChat(id) {
        return this.getChats().find(c => c.id === id);
    }

    static updateChat(updatedChat) {
        const chats = this.getChats();
        const index = chats.findIndex(c => c.id === updatedChat.id);
        if (index !== -1) {
            chats[index] = updatedChat;
        } else {
            chats.unshift(updatedChat);
        }
        this.saveChats(chats);
    }

    static deleteChat(id) {
        let chats = this.getChats();
        chats = chats.filter(c => c.id !== id);
        this.saveChats(chats);
    }

    static updateStorageIndicator() {
        let total = 0;
        for (let x in localStorage) {
            if (localStorage.hasOwnProperty(x)) {
                total += ((localStorage[x].length + x.length) * 2);
            }
        }
        const quota = 5 * 1024 * 1024; // 5MB approx
        const percent = Math.min(Math.round((total / quota) * 100), 100);
        
        const percentEl = document.getElementById('storage-percent');
        const fillEl = document.querySelector('.progress-fill');
        
        if (percentEl) percentEl.textContent = `${percent}%`;
        if (fillEl) fillEl.style.width = `${percent}%`;
        
        if (percent > 90 && fillEl) fillEl.style.background = '#ef4444';
    }
}

/**
 * ==========================================
 * 3. GESTOR DE AURA Y ANIMACIONES DENTRO DE MYAI
 * ==========================================
 */
class AuraManager {
    static container = document.getElementById('ai-aura-background');
    static customColorInput = document.getElementById('custom-aura-color');
    
    static init() {
        if (this.customColorInput) {
            this.customColorInput.addEventListener('input', (e) => {
                this.setCustomColor(e.target.value);
            });
        }
    }

    static setState(state) {
        if (!this.container) return;
        this.container.className = 'aura-bg'; // Reset
        this.container.classList.add(`state-${state}`);
        
        // Pequeña animación con Anime.js si está disponible
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.aura-layer',
                scale: state === 'thinking' ? [1, 1.2, 1] : 1,
                opacity: state === 'error' ? 0.8 : 0.4,
                duration: 2000,
                loop: state === 'thinking',
                easing: 'easeInOutSine'
            });
        }
    }

    static setCustomColor(color) {
        if (!this.container) return;
        this.container.style.setProperty('--ai-custom', color);
        this.setState('custom');
    }
    
    static toggleWaves(active) {
        const waves = document.querySelectorAll('.animated-ai-waves.small');
        waves.forEach(w => {
            if (active) w.classList.add('active');
            else w.classList.remove('active');
        });
    }
}

/**
 * ==========================================
 * 4. PROCESADOR DE ARCHIVOS (TEXT/BYTES SIMULATOR)
 * ==========================================
 */
class FileProcessor {
    constructor() {
        this.stagedFiles = []; // Archivos en preparación
        this.stagingArea = document.getElementById('file-staging-area');
        this.stagedList = document.getElementById('staged-files-list');
        this.fileInput = document.getElementById('file-upload-input');
        
        this.initListeners();
    }

    initListeners() {
        document.getElementById('btn-attach').addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        document.getElementById('clear-all-files').addEventListener('click', () => {
            this.clearAllStaged();
        });

        // Drag and Drop
        const dropZone = document.getElementById('input-zone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.border = '2px dashed #3b82f6';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.border = 'none';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.border = 'none';
            this.handleFiles(e.dataTransfer.files);
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;
        AuraManager.setState('reading');
        this.stagingArea.classList.remove('hidden');

        for (let file of files) {
            const fileId = Utils.generateId();
            this.renderStagedFile(file, fileId);
            
            try {
                // Simulación de conversión a bytes/texto
                const fileData = await this.extractContent(file);
                this.stagedFiles.push({
                    id: fileId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    content: fileData
                });
                this.updateStagedFileStatus(fileId, 'Listo');
            } catch (err) {
                console.error("Error leyendo archivo:", err);
                this.updateStagedFileStatus(fileId, 'Error');
            }
        }
        AuraManager.setState('idle');
        this.fileInput.value = ''; // Reset
    }

    extractContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // Si es un archivo de texto plano, csv, leer como texto
            if (file.type.match('text.*') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
                reader.readAsText(file);
                reader.onload = () => resolve(reader.result);
            } 
            // Si es PDF, Word, Excel, simular lectura de bytes convirtiendo a Base64
            // (Para pasarlo a Cohere en un entorno real con LangChain o RAG, 
            // requeriría un endpoint backend para OCR/Extracción profunda).
            else {
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    // Simulamos texto extraido para el modelo indicando la naturaleza del documento
                    resolve(`[CONTENIDO DEL ARCHIVO BINARIO EXTRAÍDO EN BYTES (Base64 Mapeado): ${file.name}]\nDocumento listo para análisis estructural.`);
                };
            }
            reader.onerror = error => reject(error);
        });
    }

    renderStagedFile(file, id) {
        const template = document.getElementById('tpl-staged-file').content.cloneNode(true);
        const card = template.querySelector('.staged-file-card');
        card.dataset.id = id;
        
        card.querySelector('.file-name').textContent = file.name;
        card.querySelector('.file-size').textContent = Utils.formatBytes(file.size);
        
        // Icono dependiendo del tipo
        const icon = card.querySelector('.file-icon-type i');
        if (file.name.endsWith('.pdf')) icon.className = 'fas fa-file-pdf text-red-500';
        else if (file.name.endsWith('.xlsx')) icon.className = 'fas fa-file-excel text-green-500';
        else if (file.name.endsWith('.docx')) icon.className = 'fas fa-file-word text-blue-500';
        else icon.className = 'fas fa-file-alt';

        card.querySelector('.remove-file-btn').addEventListener('click', () => {
            this.removeStagedFile(id);
        });

        this.stagedList.appendChild(card);
    }

    updateStagedFileStatus(id, status) {
        const card = this.stagedList.querySelector(`.staged-file-card[data-id="${id}"]`);
        if (card) {
            const statusEl = card.querySelector('.file-processing-status');
            statusEl.innerHTML = `<span>${status}</span>`;
            statusEl.style.animation = 'none';
            if (status === 'Listo') statusEl.style.background = '#10b981';
            if (status === 'Error') statusEl.style.background = '#ef4444';
        }
    }

    removeStagedFile(id) {
        this.stagedFiles = this.stagedFiles.filter(f => f.id !== id);
        const card = this.stagedList.querySelector(`.staged-file-card[data-id="${id}"]`);
        if (card) card.remove();
        
        if (this.stagedFiles.length === 0) {
            this.stagingArea.classList.add('hidden');
        }
    }

    clearAllStaged() {
        this.stagedFiles = [];
        this.stagedList.innerHTML = '';
        this.stagingArea.classList.add('hidden');
    }

    getStagedFilesContext() {
        if (this.stagedFiles.length === 0) return "";
        let context = "\n\n--- ARCHIVOS ADJUNTOS PROPORCIONADOS POR EL USUARIO ---\n";
        this.stagedFiles.forEach(f => {
            context += `\nArchivo: ${f.name} (Tamaño: ${Utils.formatBytes(f.size)})\nContenido extraído:\n${f.content}\n--- FIN DE ARCHIVO ---\n`;
        });
        return context;
    }
}

/**
 * ==========================================
 * 5. CLIENTE API COHERE
 * ==========================================
 */
class CohereAPIClient {
    static async generateResponse(chatHistory, newPrompt, complexityLevel, filesContext) {
        AuraManager.setState('thinking');
        AuraManager.toggleWaves(true);

        // Mapeo de complejidad a parámetros del modelo
        let temperature = 0.3;
        let max_tokens = 1000;
        let preamble = "Eres MyAI, una inteligencia artificial avanzada creada por MyAI Company. Eres experto en programación, matemáticas y despliegue de IA. Responde en español de forma útil y profesional.";

        switch (complexityLevel) {
            case 'spin': 
                temperature = 0.7; max_tokens = 500; 
                preamble += " Responde de manera ULTRA rápida, concisa y directa al punto sin rodeos.";
                break;
            case 'basico':
                temperature = 0.4; max_tokens = 1500;
                preamble += " Responde de forma normal, equilibrada y fácil de entender.";
                break;
            case 'avanzado':
                temperature = 0.2; max_tokens = 4000;
                preamble += " Proporciona respuestas muy estructuradas, detalladas, utilizando viñetas y formato Markdown.";
                break;
            case 'pro':
                temperature = 0.1; max_tokens = 8000;
                preamble += " Actúa como un experto de élite. Analiza profundamente, revisa edge cases, escribe código de nivel de producción y provee una explicación magistral.";
                break;
        }

        const fullPrompt = newPrompt + filesContext;

        // Construir historial en el formato de Cohere
        const chat_history = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'USER' : 'CHATBOT',
            message: msg.content
        }));

        try {
            const response = await fetch(AppConfig.COHERE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AppConfig.COHERE_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: AppConfig.COHERE_MODEL,
                    message: fullPrompt,
                    chat_history: chat_history,
                    temperature: temperature,
                    max_tokens: max_tokens,
                    preamble: preamble
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            AuraManager.setState('idle');
            AuraManager.toggleWaves(false);
            return data.text;

        } catch (error) {
            console.error("Error conectando con Cohere:", error);
            AuraManager.setState('error');
            AuraManager.toggleWaves(false);
            return "Lo siento, hubo un error de conexión con los servidores de MyAI. Por favor, verifica la red o intenta nuevamente en unos segundos.";
        }
    }

    static async generateTitle(firstMessage) {
        try {
            const response = await fetch(AppConfig.COHERE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AppConfig.COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: AppConfig.COHERE_MODEL,
                    message: `Resume este mensaje en un título corto de máximo 4 palabras. No uses comillas, ni puntos. Mensaje: "${firstMessage}"`,
                    temperature: 0.3,
                    max_tokens: 10
                })
            });
            const data = await response.json();
            return data.text.trim().replace(/["']/g, '');
        } catch (e) {
            return "Nueva Conversación";
        }
    }
}

/**
 * ==========================================
 * 6. MODO DE VOZ CONTINUO (WEB SPEECH API)
 * ==========================================
 */
class VoiceManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.overlay = document.getElementById('voice-mode-overlay');
        this.btnActivate = document.getElementById('btn-activate-voice');
        this.btnExit = document.getElementById('exit-voice-btn');
        this.btnToggleMic = document.getElementById('toggle-mic-btn');
        this.btnEndCall = document.getElementById('end-call-btn');
        this.transcriptionDisplay = document.getElementById('live-transcription');
        this.sphereCore = document.querySelector('.sphere-core');
        
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.currentTranscript = '';
        this.silenceTimer = null;

        this.initSpeech();
        this.initListeners();
    }

    initSpeech() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'es-ES';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUIStatus('Escuchando...', '#10b981');
                this.pulseSphere(true);
            };

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript || interimTranscript) {
                    this.currentTranscript = finalTranscript || interimTranscript;
                    this.transcriptionDisplay.textContent = this.currentTranscript;
                    
                    // Reiniciar temporizador de silencio
                    clearTimeout(this.silenceTimer);
                    // Si el usuario deja de hablar por 2.5 segundos, enviar a IA
                    this.silenceTimer = setTimeout(() => {
                        if (this.currentTranscript.trim().length > 0) {
                            this.processVoiceInput(this.currentTranscript);
                        }
                    }, 2500);
                }
            };

            this.recognition.onerror = (event) => {
                console.error("Voice Recognition Error:", event.error);
                if (event.error !== 'no-speech') {
                    this.updateUIStatus('Error en micrófono', '#ef4444');
                }
            };

            this.recognition.onend = () => {
                // Reiniciar si está activado el modo y no está hablando la IA
                if (this.isListening && !this.isSpeaking) {
                    try { this.recognition.start(); } catch(e){}
                }
            };
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }

    initListeners() {
        this.btnActivate.addEventListener('click', () => this.openVoiceMode());
        this.btnExit.addEventListener('click', () => this.closeVoiceMode());
        this.btnEndCall.addEventListener('click', () => this.closeVoiceMode());
        
        this.btnToggleMic.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
                this.btnToggleMic.classList.remove('active');
                this.btnToggleMic.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                this.updateUIStatus('Micrófono silenciado', '#94a3b8');
            } else {
                this.startListening();
                this.btnToggleMic.classList.add('active');
                this.btnToggleMic.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        });
    }

    openVoiceMode() {
        this.overlay.classList.remove('hidden');
        this.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        this.transcriptionDisplay.textContent = 'Hola, soy MyAI. Te escucho...';
        this.startListening();
    }

    closeVoiceMode() {
        this.overlay.classList.add('hidden');
        this.overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        this.stopListening();
        this.stopSpeaking();
    }

    startListening() {
        if (this.recognition && !this.isListening && !this.isSpeaking) {
            try { this.recognition.start(); } catch(e){}
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.recognition) this.recognition.stop();
        this.pulseSphere(false);
    }

    async processVoiceInput(text) {
        this.stopListening();
        this.updateUIStatus('Procesando...', '#fef08a');
        this.currentTranscript = '';
        
        // Mostrar texto del usuario en UI principal
        this.chatApp.addMessageToUI('user', text);
        this.chatApp.currentChat.messages.push({ role: 'user', content: text, timestamp: new Date() });
        
        const responseText = await CohereAPIClient.generateResponse(
            this.chatApp.currentChat.messages.slice(0, -1),
            text,
            'spin', // Modo voz usa respuestas rápidas por defecto
            ""
        );

        // Guardar respuesta de IA
        this.chatApp.currentChat.messages.push({ role: 'ai', content: responseText, timestamp: new Date() });
        this.chatApp.addMessageToUI('ai', responseText);
        StorageManager.updateChat(this.chatApp.currentChat);

        // Hablar la respuesta
        this.speakText(responseText);
    }

    speakText(text) {
        if (!this.synthesis) return;
        this.stopSpeaking();

        // Limpiar markdown para hablar
        const cleanText = text.replace(/[#*_`]/g, '').replace(/```[\s\S]*?```/g, 'Aquí tienes el bloque de código solicitado.');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
            this.updateUIStatus('Respondiendo...', '#3b82f6');
            this.transcriptionDisplay.textContent = text.substring(0, 100) + '...';
            this.pulseSphere(true, '#3b82f6');
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this.transcriptionDisplay.textContent = 'Te escucho...';
            this.startListening(); // Reanudar escucha
        };

        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.synthesis) this.synthesis.cancel();
        this.isSpeaking = false;
    }

    updateUIStatus(text, color) {
        const statusEl = document.querySelector('.voice-status');
        statusEl.textContent = text;
        statusEl.style.color = color;
    }

    pulseSphere(active, overrideColor = null) {
        if (active) {
            this.sphereCore.style.animation = 'corePulse 0.5s ease-in-out infinite alternate';
            if (overrideColor) {
                this.sphereCore.style.background = `radial-gradient(circle, ${overrideColor}, #0f172a)`;
            } else {
                this.sphereCore.style.background = `radial-gradient(circle, #3b82f6, #10b981)`;
            }
        } else {
            this.sphereCore.style.animation = 'none';
            this.sphereCore.style.background = '#334155';
        }
    }
}

/**
 * ==========================================
 * 7. GESTOR DE PORTAPAPELES Y UTILIDADES GLOBALES
 * ==========================================
 */
class ClipboardManager {
    static copyCode(btn) {
        const pre = btn.parentElement.nextElementSibling.querySelector('code');
        navigator.clipboard.writeText(pre.textContent).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.color = '';
            }, 2000);
        });
    }

    static copyMessage(btn) {
        const contentDiv = btn.closest('.message-bubble').querySelector('.message-content');
        navigator.clipboard.writeText(contentDiv.innerText).then(() => {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => btn.innerHTML = '<i class="far fa-copy"></i>', 2000);
        });
    }
}

// Hacer globales para acceso en templates
window.ClipboardManager = ClipboardManager;

/**
 * ==========================================
 * 8. CONTROLADOR PRINCIPAL DE LA APLICACIÓN (UI & LOGIC)
 * ==========================================
 */
class MyAIWorkspace {
    constructor() {
        // Core Components
        this.fileProcessor = new FileProcessor();
        this.voiceManager = new VoiceManager(this);
        
        // State
        this.currentChat = null;
        this.chats = StorageManager.getChats();
        
        // DOM Elements
        this.initDOM();
        
        // Initialization
        AuraManager.init();
        this.initEvents();
        this.renderHistoryList();
        this.startNewChat();
        StorageManager.updateStorageIndicator();
    }

    initDOM() {
        this.mainInput = document.getElementById('main-chat-input');
        this.sendBtn = document.getElementById('btn-send-message');
        this.chatContainer = document.getElementById('chat-messages-container');
        this.scrollArea = document.getElementById('chat-messages-scroll');
        this.workspaceCore = document.getElementById('workspace-core');
        this.chatTitleEl = document.getElementById('current-chat-title');
        this.complexitySelect = document.getElementById('ai-complexity-level');
        this.tokenCounter = document.getElementById('token-counter');
        
        // Sidebar Elements
        this.historyContainer = document.getElementById('chat-history-container');
        this.btnNewChat = document.getElementById('btn-new-chat');
        this.searchInput = document.getElementById('search-history');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.mobileToggle = document.getElementById('mobile-menu-toggle');
        this.sidebar = document.getElementById('main-sidebar');
    }

    initEvents() {
        // Input Handling
        this.mainInput.addEventListener('input', () => this.handleInput());
        this.mainInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Sidebar Actions
        this.btnNewChat.addEventListener('click', () => this.startNewChat());
        
        this.searchInput.addEventListener('input', (e) => this.filterHistoryList(e.target.value));
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyHistoryFilter(btn.dataset.filter);
            });
        });

        // Mobile Menu
        this.mobileToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('open');
        });

        // Edit Title
        document.querySelector('.edit-title-btn').addEventListener('click', () => {
            const newTitle = prompt("Nuevo nombre para el chat:", this.currentChat.title);
            if (newTitle) {
                this.currentChat.title = newTitle;
                this.chatTitleEl.textContent = newTitle;
                StorageManager.updateChat(this.currentChat);
                this.renderHistoryList();
            }
        });

        // Suggested prompts
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                const promptText = card.querySelector('p').textContent;
                this.mainInput.value = promptText;
                this.handleInput();
                this.mainInput.focus();
            });
        });
    }

    handleInput() {
        // Auto-resize textarea
        this.mainInput.style.height = 'auto';
        this.mainInput.style.height = (this.mainInput.scrollHeight) + 'px';
        
        // Botón send state
        const val = this.mainInput.value.trim();
        if (val.length > 0 || this.fileProcessor.stagedFiles.length > 0) {
            this.sendBtn.classList.remove('disabled');
        } else {
            this.sendBtn.classList.add('disabled');
        }

        // Token Counter (Aproximación simple: 1 palabra = ~1.3 tokens)
        const wordCount = val.split(/\s+/).filter(w => w.length > 0).length;
        const estTokens = Math.floor(wordCount * 1.3);
        this.tokenCounter.textContent = `${estTokens} / ${AppConfig.MAX_TOKENS_LIMIT}`;
        if (estTokens > AppConfig.MAX_TOKENS_LIMIT * 0.8) {
            this.tokenCounter.style.color = '#f59e0b';
        } else {
            this.tokenCounter.style.color = '';
        }
    }

    startNewChat() {
        this.currentChat = {
            id: Utils.generateId(),
            title: "Nueva Conversación",
            date: new Date(),
            messages: [],
            isStarred: false
        };
        
        // Reset UI
        this.chatTitleEl.textContent = this.currentChat.title;
        this.chatContainer.innerHTML = '';
        this.mainInput.value = '';
        this.mainInput.style.height = 'auto';
        this.fileProcessor.clearAllStaged();
        this.handleInput();
        
        // Restore Centered View
        this.workspaceCore.classList.add('view-centered');
        this.scrollArea.classList.add('hidden');
        
        // Remove active state from sidebar
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
    }

    async loadChat(id) {
        const chat = StorageManager.getChat(id);
        if (!chat) return;

        this.currentChat = chat;
        this.chatTitleEl.textContent = chat.title;
        this.chatContainer.innerHTML = '';
        this.workspaceCore.classList.remove('view-centered');
        this.scrollArea.classList.remove('hidden');

        // Restore messages
        chat.messages.forEach(msg => {
            this.addMessageToUI(msg.role, msg.content, msg.level, msg.files);
        });

        // Update active class in sidebar
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });
        
        this.scrollToBottom();
    }

    async sendMessage() {
        const text = this.mainInput.value.trim();
        const stagedFiles = [...this.fileProcessor.stagedFiles]; // Clonar
        
        if (text.length === 0 && stagedFiles.length === 0) return;
        if (this.sendBtn.classList.contains('disabled')) return;

        // Transition UI on first message
        if (this.currentChat.messages.length === 0) {
            this.workspaceCore.classList.remove('view-centered');
            this.scrollArea.classList.remove('hidden');
            
            // Generar título asíncronamente
            CohereAPIClient.generateTitle(text).then(newTitle => {
                this.currentChat.title = newTitle;
                this.chatTitleEl.textContent = newTitle;
                StorageManager.updateChat(this.currentChat);
                this.renderHistoryList();
            });
        }

        // 1. Mostrar mensaje del usuario
        this.addMessageToUI('user', text, null, stagedFiles);
        
        // 2. Guardar en estado
        this.currentChat.messages.push({
            role: 'user',
            content: text,
            files: stagedFiles.map(f => ({name: f.name, size: f.size})),
            timestamp: new Date()
        });
        StorageManager.updateChat(this.currentChat);

        // 3. Limpiar Input y Staging
        this.mainInput.value = '';
        this.mainInput.style.height = 'auto';
        this.fileProcessor.clearAllStaged();
        this.handleInput();
        this.scrollToBottom();

        // 4. Preparar contexto para IA
        const filesContext = this.fileProcessor.getStagedFilesContext();
        const complexity = this.complexitySelect.value;
        const complexityText = this.complexitySelect.options[this.complexitySelect.selectedIndex].text;

        // 5. Mostrar Typing Indicator
        this.showTypingIndicator(complexityText);

        // 6. Llamar a API Cohere
        const responseText = await CohereAPIClient.generateResponse(
            this.currentChat.messages.slice(0, -1), // Enviar historial anterior
            text,
            complexity,
            filesContext
        );

        // 7. Remover Typing, Agregar IA Message
        this.removeTypingIndicator();
        this.addMessageToUI('ai', responseText, complexityText);
        
        // 8. Guardar respuesta en estado
        this.currentChat.messages.push({
            role: 'ai',
            content: responseText,
            level: complexityText,
            timestamp: new Date()
        });
        StorageManager.updateChat(this.currentChat);
        this.renderHistoryList(); // Refrescar lista para mover al top
        this.scrollToBottom();
    }

    addMessageToUI(role, content, levelTag = null, files = []) {
        const templateId = role === 'user' ? 'tpl-user-message' : 'tpl-ai-message';
        const template = document.getElementById(templateId).content.cloneNode(true);
        const row = template.querySelector('.message-row');
        const contentDiv = row.querySelector('.message-content');
        
        // Hora
        row.querySelector('.msg-time').textContent = Utils.formatDate(new Date());

        if (role === 'user') {
            // Renderizar archivos adjuntos en el mensaje de usuario
            if (files && files.length > 0) {
                const filesContainer = document.createElement('div');
                filesContainer.style.marginBottom = '10px';
                
                files.forEach(f => {
                    const attTpl = document.getElementById('tpl-chat-file-attachment').content.cloneNode(true);
                    const attBox = attTpl.querySelector('.chat-attachment-box');
                    attBox.querySelector('.att-name').textContent = f.name;
                    // Ajustar icono
                    if(f.name.endsWith('.pdf')) attBox.querySelector('i').className = 'fas fa-file-pdf text-red-500';
                    filesContainer.appendChild(attBox);
                });
                contentDiv.appendChild(filesContainer);
            }
            // Agregar texto
            if (content) {
                const textSpan = document.createElement('span');
                textSpan.textContent = content;
                contentDiv.appendChild(textSpan);
            }
        } else {
            // IA: Parsear Markdown a HTML
            contentDiv.innerHTML = Utils.parseMarkdown(content);
            
            if (levelTag) {
                row.querySelector('.msg-level-tag').textContent = levelTag.split(' ')[1]; // Extraer solo la palabra clave
            }

            // Bind herramientas IA
            const copyBtn = row.querySelector('.btn-copy-msg');
            if(copyBtn) copyBtn.addEventListener('click', () => window.ClipboardManager.copyMessage(copyBtn));
            
            // >>> LOGICA CORREGIDA: Programación del Botón de Regenerar (Asíncrono y Automático) <<<
            const regenerateBtn = row.querySelector('.btn-regenerate');
            if (regenerateBtn) {
                regenerateBtn.addEventListener('click', async () => {
                    // Verificar que exista una instancia válida de chat y mensajes
                    if (!this.currentChat || this.currentChat.messages.length === 0) return;

                    // Obtener el último mensaje guardado en memoria
                    const lastMsg = this.currentChat.messages[this.currentChat.messages.length - 1];
                    
                    // Si el último mensaje es de la IA, lo eliminamos tanto de la pantalla como de la base de datos local
                    if (lastMsg.role === 'ai') {
                        this.currentChat.messages.pop(); // Elimina de la memoria interna
                        row.remove();                    // Elimina visualmente el mensaje de la IA de la interfaz
                        
                        // Buscar el último mensaje que envió el usuario en este chat para repetir la petición
                        const userMessages = this.currentChat.messages.filter(m => m.role === 'user');
                        if (userMessages.length > 0) {
                            const lastUserText = userMessages[userMessages.length - 1].content;
                            
                            // Cargamos el texto de nuevo en tu barra y ejecutamos tu función nativa de envío de forma asíncrona
                            this.mainInput.value = lastUserText;
                            await this.sendMessage();
                        }
                    }
                });
            }
            
            const readBtn = row.querySelector('.btn-read-aloud');
            if(readBtn) {
                readBtn.addEventListener('click', () => {
                    const synth = window.speechSynthesis;
                    const utterance = new SpeechSynthesisUtterance(content.replace(/[*_`#]/g, ''));
                    utterance.lang = 'es-ES';
                    synth.speak(utterance);
                });
            }
        }

        this.chatContainer.appendChild(row);
    }

    showTypingIndicator(levelName) {
        const template = document.getElementById('tpl-typing-indicator').content.cloneNode(true);
        const indicator = template.querySelector('#global-typing-indicator');
        indicator.querySelector('.current-level-display').textContent = levelName;
        this.chatContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('global-typing-indicator');
        if (indicator) indicator.remove();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
        }, 50); // Pequeño delay para permitir renderizado del DOM
    }

    // Sidebar Render Logic
    renderHistoryList(filterQuery = '', filterType = 'all') {
        this.chats = StorageManager.getChats();
        this.historyContainer.innerHTML = '';
        
        let filteredChats = this.chats;

        // Búsqueda de texto
        if (filterQuery) {
            filteredChats = filteredChats.filter(c => 
                c.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
                c.messages.some(m => m.content.toLowerCase().includes(filterQuery.toLowerCase()))
            );
        }

        // Filtro por tipo
        if (filterType === 'today') {
            const todayStr = new Date().toDateString();
            filteredChats = filteredChats.filter(c => new Date(c.date).toDateString() === todayStr);
        } else if (filterType === 'starred') {
            filteredChats = filteredChats.filter(c => c.isStarred);
        }

        if (filteredChats.length === 0) {
            this.historyContainer.innerHTML = `
                <div class="history-empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No se encontraron conversaciones</p>
                </div>
            `;
            return;
        }

        filteredChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${this.currentChat && this.currentChat.id === chat.id ? 'active' : ''}`;
            item.dataset.id = chat.id;
            
            const starClass = chat.isStarred ? 'fas fa-star text-yellow-400' : 'far fa-star';
            
            item.innerHTML = `
                <i class="fas fa-message chat-icon"></i>
                <div class="chat-info">
                    <span class="chat-title">${chat.title}</span>
                    <span class="chat-date">${Utils.formatDateFull(new Date(chat.date))}</span>
                </div>
                <div class="chat-actions">
                    <button class="action-icon star-chat-btn"><i class="${starClass}"></i></button>
                    <button class="action-icon delete-chat-btn"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;

            // Listeners
            item.addEventListener('click', (e) => {
                if(e.target.closest('.chat-actions')) return; // Ignore if clicking actions
                this.loadChat(chat.id);
                if(window.innerWidth <= 768) this.sidebar.classList.remove('open'); // Cierra sidebar en móvil
            });

            item.querySelector('.star-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                chat.isStarred = !chat.isStarred;
                StorageManager.updateChat(chat);
                this.renderHistoryList(filterQuery, filterType);
            });

            item.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm('¿Eliminar esta conversación?')) {
                    StorageManager.deleteChat(chat.id);
                    if(this.currentChat && this.currentChat.id === chat.id) this.startNewChat();
                    this.renderHistoryList(filterQuery, filterType);
                }
            });

            this.historyContainer.appendChild(item);
        });
    }

    filterHistoryList(query) {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        this.renderHistoryList(query, activeFilter);
    }

    applyHistoryFilter(type) {
        const query = this.searchInput.value;
        this.renderHistoryList(query, type);
    }
}

/**
 * ==========================================
 * 9. INICIALIZACIÓN GLOBAL
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // Instanciar la aplicación
    window.MyAI = new MyAIWorkspace();

    // Sistema Global de Tooltips
    const tooltip = document.getElementById('global-tooltip');
    document.querySelectorAll('.tooltip-target').forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const text = el.dataset.tooltip;
            if(!text) return;
            tooltip.textContent = text;
            tooltip.classList.remove('hidden');
            tooltip.classList.add('visible');
            
            const rect = el.getBoundingClientRect();
            // Posicionar arriba por defecto
            let top = rect.top - tooltip.offsetHeight - 10;
            let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
            
            if (top < 0) top = rect.bottom + 10; // Si no cabe arriba, poner abajo
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${Math.max(10, left)}px`;
        });
        el.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
            setTimeout(() => { if(!tooltip.classList.contains('visible')) tooltip.classList.add('hidden'); }, 200);
        });
    });
});