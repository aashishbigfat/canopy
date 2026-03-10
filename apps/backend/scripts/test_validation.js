const fetch = require('node-fetch');

async function testApi() {
    console.log("Testing strict validations on /api/v1/auth/register...");

    const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "1", // Too short
            email: "invalid-email", // Invalid email
            password: "weak", // Invalid complexity
            confirm_password: "weak"
        })
    });

    console.log("Status Code:", res.status);
    const data = await res.json();
    console.log("Response Body:", JSON.stringify(data, null, 2));
}

testApi();
