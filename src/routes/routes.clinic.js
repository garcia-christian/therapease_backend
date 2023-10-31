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
        const { username, email, password, profile } = req.body;

        // check
        const user = await pool.query(`select * from public.clinic_account where "EMAIL" = $1`, [email]);

        if (user.rows.length !== 0) {
            return res.status(401).json("Clinic already exist")
        }

        //encrypt password
        const round = 10;
        const salt = await bcrypt.genSalt(round);

        const encryptedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(`INSERT INTO public.clinic_account(
            "EMAIL", "USERNAME", "PASSWORD", "CLINIC_PROFILE")
        VALUES ( $1, $2, $3, $4) returning *`,
            [email, username, encryptedPassword, profile]);

        // generate token
        const access = tokenGenerator(newUser.rows[0].ID);

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
        const user = await pool.query(`select * from public.clinic_account where "EMAIL" = $1`, [email])

        if (user.rows.length === 0) {
            return res.status(401).json("User Not found");
        }


        // check if password is correct
        const validPassword = await bcrypt.compare(password, user.rows[0].PASSWORD);

        if (!validPassword) {
            return res.status(401).json("Invalid Password");
        }

        // give token
        console.log(user.rows[0].ID);
        const access = tokenGenerator(user.rows[0]);

        res.json({ access })

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});



router.get("/get-profiles/:clinicID", validator, async (req, res) => {

    try {
        // reconstruct req.body
        const { clinicID } = req.params;

        //check if exist
        const users = await pool.query(`SELECT "ID", "EMAIL", "PASSWORD", "USERNAME", "NAME", "ROLE", "CLINIC_ACCOUNT", "ADDRESS", "CONTACT_NO", "AGE", "SEX", "PROFILE_PICTURE"
        FROM public.employees_account
        where "CLINIC_ACCOUNT" = $1;`, [clinicID])


        res.json(users.rows)

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/is-verify", authorization, async (req, res) => {
    try {
        res.json(true);
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});
module.exports = router;