
// No import needed for Node.js 18+

async function testApi() {
    const url = 'https://nenmatu-chosei-bot.vercel.app/api/chat';
    console.log(`Testing API: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: '年末調整の期限はいつですか？'
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log('Response Data:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log('Error Body:', text);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testApi();
