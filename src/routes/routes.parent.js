const pool = require("../config/db");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const validator = require("../middleware/validator")
const authorization = require("../middleware/authorization")
const tokenGenerator = require("../utils/tokenGen");
const jwt = require("jsonwebtoken")

router.post("/register", validator, async (req, res) => {

    try {

        // decon
        const { FULLNAME, username, email, CONTACT_NUMBER, ADDRESS, password } = req.body;

        // check
        const user = await pool.query(`select * from public.parent_account where "EMAIL" = $1`, [email]);

        if (user.rows.length !== 0) {
            return res.status(401).json("User already exist")
        }

        //encrypt password
        const round = 10;
        const salt = await bcrypt.genSalt(round);

        const encryptedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(`INSERT INTO public.parent_account(
            "FULLNAME", "USERNAME", "EMAIL", "CONTACT_NUMBER", "ADDRESS", "PASSWORD")
            VALUES ($1, $2, $3, $4, $5, $6) returning *`,
            [FULLNAME, username, email, CONTACT_NUMBER, ADDRESS, encryptedPassword]);

        // generate token
        const access = tokenGenerator(newUser.rows[0]);

        res.json({ access })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error")
    }
});

router.post("/login", validator, async (req, res) => {

    try {
        // reconstruct req.body
        const { email, password } = req.body;

        //check if exist
        const user = await pool.query(`select * from public.parent_account where "EMAIL" = $1`, [email])

        if (user.rows.length === 0) {
            return res.status(401).json("User Not found");
        }

        // check if password is correct
        const validPassword = await bcrypt.compare(password, user.rows[0].PASSWORD);

        if (!validPassword) {
            return res.status(401).json("Invalid Password");
        }
        const access = tokenGenerator(user.rows[0]);

        res.json({ access })

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/get-user/:ID", validator, async (req, res) => {

    try {

        const { ID } = req.params;

        const user = await pool.query(`select * from public.parent_account where "ID" = $1`, [ID],);

        res.json(user.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

module.exports = router;
