const cron = require('node-cron');
const { processEmails } = require('./classifier');

let isRunning = false;

/**
 * Start the email processing scheduler
 * Runs every 5 minutes
 */
function startScheduler() {
    // Run every 15 minutes to avoid OVH rate limiting
    const interval = process.env.SCHEDULER_INTERVAL_MINUTES || 15;
    const cronExpression = `*/${interval} * * * *`;

    console.log(`⏰ Starting scheduler - will run every ${interval} minutes`);

    // Run immediately on startup
    // runClassifier();

    // Schedule recurring runs
    cron.schedule(cronExpression, () => {
        runClassifier();
    });
}

/**
 * Run the classifier with concurrency protection
 */
async function runClassifier() {
    if (isRunning) {
        console.log('⚠️ Previous classification still running, skipping this cycle');
        return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🕐 Starting scheduled email classification - ${new Date().toISOString()}`);
        console.log('='.repeat(60));

        const result = await processEmails();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Scheduler completed in ${duration}s`);
        console.log(`   Processed: ${result.processed}, Deleted: ${result.deleted}, Kept: ${result.kept}`);

    } catch (error) {
        console.error('❌ Scheduler error:', error);
    } finally {
        isRunning = false;
    }
}

/**
 * Manually trigger a classification run (for API endpoint)
 */
async function manualRun() {
    return runClassifier();
}

module.exports = { startScheduler, manualRun };
