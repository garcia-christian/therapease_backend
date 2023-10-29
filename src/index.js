const server = require('./server');

const PORT = process.env.PORT || 5500;

const startServer = () => {
    server.listen(PORT, () => {
        console.log(`server running at ${PORT}`);
    })
}




startServer(); 