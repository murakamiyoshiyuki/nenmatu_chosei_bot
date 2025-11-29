
async function testStream() {
    const url = 'https://nenmatu-chosei-bot.vercel.app/api/chat';
    console.log(`Testing Stream API: ${url}`);

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

        if (!response.ok) {
            const text = await response.text();
            console.log('Error Body:', text);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let startTime = Date.now();
        let firstChunkTime = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (!firstChunkTime) {
                firstChunkTime = Date.now();
                console.log(`First chunk received after ${firstChunkTime - startTime}ms`);
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log('Chunk:', chunk.trim());
        }

        console.log(`Stream finished after ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testStream();
