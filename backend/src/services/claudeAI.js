const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307';

/**
 * Classify an email using Claude AI
 * @param {Object} email - Email object with from, subject, text
 * @returns {Object} - { classification, reasoning }
 */
async function classifyEmail(email) {
    try {
        const prompt = `
Tu es un assistant expert en tri d'emails subissant une surcharge de messages. Ton rôle est d'être STRICT pour ne laisser passer que l'essentiel.
Classe l'email suivant en 3 catégories :
1. SPAM : Publicités, newsletters, annonces de ventes aux enchères (ex: priseur.net, interencheres), catalogues de lots, offres promotionnelles, sollicitations commerciales.
2. INUTILE : Notifications automatiques de réseaux sociaux (LinkedIn, Facebook), alertes de connexion, confirmations de newsletters choisies mais non urgentes.
3. IMPORTANT : Emails envoyés par des humains (collègues, clients, famille), factures, documents administratifs, alertes de sécurité critiques, relances réelles.

Règles :
- Les publicités déguisées en "alertes" ou "ventes de lots" sont du SPAM.
- Si c'est une machine qui envoie une offre commerciale : SPAM.
- Ne garde comme IMPORTANT que ce qui nécessite une lecture ou une action de l'utilisateur.

Tu dois répondre UNIQUEMENT au format JSON :
{
  "classification": "SPAM" | "INUTILE" | "IMPORTANT",
  "reasoning": "Explication courte"
}

Email à analyser :
Expéditeur : ${email.from}
Sujet : ${email.subject}
Contenu : ${email.text ? email.text.substring(0, 2000) : '(Vide)'}
`;

        const message = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const responseText = message.content[0].text;

        // Try to parse JSON response
        let result;
        try {
            // Remove markdown code blocks if present
            const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            result = JSON.parse(cleanedResponse);
        } catch (parseErr) {
            console.warn('⚠️ Could not parse Claude response as JSON, using fallback');
            // Fallback: try to extract classification from text
            if (responseText.includes('SPAM')) {
                result = { classification: 'SPAM', reasoning: responseText };
            } else if (responseText.includes('INUTILE')) {
                result = { classification: 'INUTILE', reasoning: responseText };
            } else {
                result = { classification: 'IMPORTANT', reasoning: 'Unable to classify, keeping safe' };
            }
        }

        console.log(`🤖 Claude classified email as: ${result.classification}`);
        return result;

    } catch (error) {
        console.error('❌ Error calling Claude AI:', error.message);
        // In case of error, default to IMPORTANT to be safe
        return {
            classification: 'IMPORTANT',
            reasoning: `Error during classification: ${error.message}. Kept for safety.`
        };
    }
}

module.exports = { classifyEmail };
