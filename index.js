const { BotFrameworkAdapter, CardFactory } = require('botbuilder');
const restify = require('restify');
const axios = require('axios');

const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const apiKey = process.env.REACT_APP_NEWS_API_KEY

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
});

const createNewsCard = (article) => {
    const imageUrl = Array.isArray(article.urlToImage) ? article.urlToImage[0] : article.urlToImage;

    return CardFactory.heroCard(
        article.title,
        article.description,
        null,
        [
            {
                type: 'openUrl',
                title: 'Read More',
                value: article.url
            }
        ],
        { images: imageUrl ? [{ url: imageUrl }] : undefined }

    );
};

const newsDialog = async (turnContext) => {
    const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=us&category=technology&pageSize=5&apiKey=${apiKey}`;


    try {
        const newsResponse = await axios.get(newsApiUrl);
        const articles = newsResponse.data.articles;

        if (articles && articles.length > 0) {
            // Create Adaptive Cards for each news article
            const newsCards = articles.map(createNewsCard);

            // Send the Adaptive Cards as an attachment
            const message = {
                type: 'message',
                attachments: newsCards
            };

            await turnContext.sendActivity(message);
        } else {
            await turnContext.sendActivity('No news available at the moment.');
        }
    } catch (error) {
        console.error('Error fetching news:', error.message);
        await turnContext.sendActivity('Sorry, there was an issue fetching the latest news. Please try again later.');
    }
};

server.post('/api/messages', (req, res, next) => {
    adapter.processActivity(req, res, async (turnContext) => {
        if (turnContext.activity.type === 'message') {
            // Check if the user is asking for news
            const userMessage = turnContext.activity.text.toLowerCase();
            if (userMessage.includes('news') || userMessage.includes('headline')) {
                await newsDialog(turnContext);
            } else {
                // Respond to other types of queries or initiate additional dialogs
                await turnContext.sendActivity('I can provide the latest news. Just ask for headlines!');
            }
        } else {
            await turnContext.sendActivity('Hello!');
        }
    });
    next();
});
