const COHERE_API_KEY = "tEiSQlInoBfW2U1gtSgElZaNHbookFyGzLI2Vuuz";

let currentPreamble = `Tu nombre es MyAI. Eres el consultor experto en ventas de este sitio web. Tu objetivo es educar brillantemente al usuario sobre el retorno de inversión y valor operativo de nuestros 3 paquetes disponibles y nuestros add-ons corporativos.
NUESTROS PAQUETES:
1. Telegram Core ($50 USD): Despliegue de un bot autónomo e inteligente en Telegram para respuestas comerciales 24/7.
2. Web & Database Pro ($100 USD): IA con interfaz web estilizada, soporte en Telegram y bases de datos integradas para retener el historial de chat de los usuarios. Es el más equilibrado.
3. Enterprise Omni ($500 USD iniciales + $100 USD anuales de mantenimiento): Solución analítica completa y de gran escala para medianas y grandes empresas.
NUESTROS ADD-ONS Y SERVICIOS EXTRA PARA NEGOCIOS:
- Base de Conocimiento Privada (RAG): Cargar PDFs, inventarios y políticas de la empresa para respuestas hiper-precisas.
- Sincronización con CRM e Infraestructura: Guardar prospectos y datos en HubSpot, Zoho, Google Sheets de forma automática.
- Agendamiento Autónomo de Citas: Sincronizar el chat con Google Calendar o Calendly para reservar llamadas al instante.
- Soporte Global Multilingüe: Configurar la IA para interactuar fluidamente en inglés, portugués, francés, etc.
- Retainers de Mantenimiento Mensual: Optimización de respuestas, monitoreo de caídas y bolsas de tokens personalizadas.
Debes responder con un tono corporativo, profesional, persuasivo y muy conciso. No inventes tecnologías externas ni menciones nombres de proveedores específicos de APIs de IA. Explica cómo automatizar procesos ahorra costos en personal y tiempo.`;

// --- INTERSECTION OBSERVER PARA EFECTOS REVEAL ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { 
        if (entry.isIntersecting) entry.target.classList.add('active'); 
    });
}, { root: null, threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

// --- PASARELA MODAL DE PAGOS ---
function openPaymentModal(packageName, price) {
    document.getElementById('modalTitle').innerText = `Desplegar Módulo: ${packageName}`;
    document.getElementById('modalPrice').innerText = `Inversión: $${price}.00 USD`;
    document.getElementById('paymentModal').classList.add('open');
}

function closePaymentModal() { 
    document.getElementById('paymentModal').classList.remove('open'); 
}

function confirmSimulatedPayment() { 
    alert("🔒 [PROTOCOLO SEGURO]: Canal de pago autenticado. El aprovisionamiento de su paquete seleccionado ha comenzado en la nube."); 
    closePaymentModal(); 
}

// --- TERMINAL CHATBOT WIDGET ---
function toggleChat() {
    const chat = document.getElementById('chatWidget');
    const icon = document.getElementById('toggleIcon');
    chat.classList.toggle('collapsed');
    icon.innerText = chat.classList.contains('collapsed') ? '▲' : '▼';
}

function selectCategory(categoryName) {
    const chat = document.getElementById('chatWidget');
    chat.classList.remove('collapsed');
    document.getElementById('toggleIcon').innerText = '▼';
    
    currentPreamble += ` El usuario ha manifestado interés directo al hacer clic sobre la solución / add-on empresarial [${categoryName}]. Preséntale este módulo como la solución definitiva y explícales con autoridad cómo este add-on se amortizará rápidamente al eliminar errores manuales y optimizar recursos del negocio.`;

    const chatBody = document.getElementById('chatBody');
    const botMsg = document.createElement('div');
    botMsg.className = 'msg bot';
    botMsg.innerHTML = `🤖 <strong>[SISTEMA MyAI]</strong>: Módulo de enfoque cambiado hacia <em>${categoryName}</em>. He preparado el análisis de implementación estratégica para este add-on. Cuénteme qué problema operativo busca solucionar hoy para optimizar la propuesta.`;
    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const chatBody = document.getElementById('chatBody');
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user'; 
    userMsg.innerText = text;
    chatBody.appendChild(userMsg);
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'msg bot'; 
    loadingMsg.innerText = 'Analizando parámetros de inversión...';
    chatBody.appendChild(loadingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${COHERE_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                message: text, 
                model: 'command-r-08-2024', 
                preamble: currentPreamble 
            })
        });
        const data = await response.json();
        chatBody.removeChild(loadingMsg);
        
        const botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        botMsg.innerText = (response.ok && data.text) ? data.text : `[AVISO]: Línea comercial saturada temporalmente. Estado: ${response.status}.`;
        chatBody.appendChild(botMsg);
    } catch (error) {
        chatBody.removeChild(loadingMsg);
        const botMsg = document.createElement('div');
        botMsg.className = 'msg bot'; 
        botMsg.innerText = 'Error de enlace. Intente nuevamente.';
        chatBody.appendChild(botMsg);
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

function handleKeyPress(e) { 
    if (e.key === 'Enter') sendMessage(); 
}