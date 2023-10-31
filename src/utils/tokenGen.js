const jwt = require("jsonwebtoken")
require('dotenv').config();


function tokenGenerator(user) {
    const payload = {
        ID: user.ID,
        Email: user.EMAIL
    }

    return jwt.sign(payload, process.env.jwtSecret, { expiresIn: "1hr" })

}
module.exports = tokenGenerator;