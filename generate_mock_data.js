/**
 * Run this script in the Chrome Extension's console (e.g., in the Dashboard page console)
 * to populate the local storage with 100 mock tickets.
 */

(function generateWardenMockData() {
    const intents = [
        "account_freeze",
        "amount_debited_not_credited_upi",
        "fraud_transaction_upi",
        "incorrect_account_transfer_upi",
        "out_of_scope",
        "unable_to_receive_money_upi"
    ];

    const actions = ["TRAVERSE_DT", "REASSIGN"];
    const results = ["RESOLVED", "NOT_RESOLVED"];
    const subTrees = [
        "Amount Debited but not Credited to beneficiary",
        "Fraud Transaction UPI",
        "Incorrect Account Transfer UPI",
        "Unable to Receive Money UPI",
        "N/A"
    ];

    const sampleVoc = [
        "My account is frozen please help",
        "Money debited but not received by friend",
        "I was scammed by a fake website",
        "Sent money to wrong account number",
        "What is the weather today?",
        "Cannot receive money on my UPI ID"
    ];

    const mockData = [];
    const now = new Date();

    for (let i = 1; i <= 100; i++) {
        const date = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random date in last 7 days
        const intent = intents[Math.floor(Math.random() * intents.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const result = action === "TRAVERSE_DT" ? "RESOLVED" : "NOT_RESOLVED";
        
        mockData.push({
            ticketId: `TKT-${1000 + i}`,
            timestamp: date.toLocaleString(),
            extractedVoc: sampleVoc[Math.floor(Math.random() * sampleVoc.length)],
            intent: intent,
            confidence: 0.5 + Math.random() * 0.49,
            action: action,
            decisionTree: intent === "account_freeze" ? "Customer- Debit/Credit Freeze" : "UPI Related concern",
            sub_tree: intent === "account_freeze" ? "N/A" : subTrees[Math.floor(Math.random() * (subTrees.length - 1))],
            result: result,
            feedbackRating: Math.random() > 0.7 ? (Math.random() > 0.5 ? 5 : 1) : 0,
            feedbackRemarks: Math.random() > 0.8 ? "Mock feedback for testing." : ""
        });
    }

    chrome.storage.local.set({ ticketLogs: mockData }, () => {
        console.log("✅ 100 Mock tickets generated and saved to local storage!");
        console.log("Please refresh your Dashboard to see the data.");
    });
})();
