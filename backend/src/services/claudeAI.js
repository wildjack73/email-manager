const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

/**
 * Classify an email using Claude AI
 * @param {Object} email - Email object with from, subject, text
 * @returns {Object} - { classification, reasoning }
 */
async function classifyEmail(email) {
    try {
        const prompt = `Tu es un assistant IA spécialisé dans le tri d'emails. Ton rôle est d'analyser un email et de le classifier en 3 catégories :

**SPAM** : Publicités non sollicitées, arnaque, phishing, emails suspects
**INUTILE** : Newsletters non importantes, notifications sociales, promotions de marques connues
**IMPORTANT** : Emails de clients, documents officiels, factures, emails professionnels importants

Règles strictes :
- Les emails de banques, impôts, URSSAF, notaires, avocats sont TOUJOURS IMPORTANT
- Les emails d'administrations françaises (.gouv.fr) sont TOUJOURS IMPORTANT
- En cas de doute, privilégie IMPORTANT plutôt que de risquer de supprimer un email utile

Analyse cet email :

**Expéditeur** : ${email.from}
**Email** : ${email.fromEmail}
**Sujet** : ${email.subject}
**Contenu** : ${email.text ? email.text.substring(0, 1000) : '(Vide)'}

Réponds UNIQUEMENT au format JSON suivant (sans markdown) :
{
  "classification": "SPAM|INUTILE|IMPORTANT",
  "reasoning": "Explication courte de ta décision"
}`;

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
