const pool = require("../config/db");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const validator = require("../middleware/validator")
const authorization = require("../middleware/authorization")
const tokenGenerator = require("../utils/tokenGen");
const jwt = require("jsonwebtoken")

router.post("/register", validator, authorization, async (req, res) => {
    try {

        // decon
        const { ROLE, NAME, email, password, CLINIC_ACCOUNT, ADDRESS, CONTACT_NO, AGE, SEX, PROFILE_PICTURE, username } = req.body;

        // check
        const user = await pool.query(`select * from public.employees_account where "EMAIL" = $1`, [email]);

        if (user.rows.length !== 0) {
            return res.status(401).json("User already exist")
        }

        //encrypt password
        const round = 10;
        const salt = await bcrypt.genSalt(round);

        const encryptedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(`INSERT INTO public.employees_account(
             "ROLE", "NAME", "PASSWORD", "CLINIC_ACCOUNT", "ADDRESS", "CONTACT_NO", "AGE", "SEX", "PROFILE_PICTURE","EMAIL","USERNAME", "STATUS", "ABOUT")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning *`,
            [ROLE, NAME, encryptedPassword, CLINIC_ACCOUNT, ADDRESS, CONTACT_NO, AGE, SEX, PROFILE_PICTURE, email, username, 1, " "]);

        // generate token
        const access = tokenGenerator(newUser.rows[0]);

        res.json({ access })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error")
    }
});

router.post("/register-solo", validator, async (req, res) => {

    try {

        // decon
        const { ROLE, NAME, email, password, ADDRESS, CONTACT_NO, AGE, SEX, PROFILE_PICTURE, username } = req.body;

        // check
        const user = await pool.query(`select * from public.employees_account where "EMAIL" = $1`, [email]);

        if (user.rows.length !== 0) {
            return res.status(401).json("User already exist")
        }

        //encrypt password
        const round = 10;
        const salt = await bcrypt.genSalt(round);

        const encryptedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(`INSERT INTO public.employees_account(
             "ROLE", "NAME", "PASSWORD", "CLINIC_ACCOUNT", "ADDRESS", "CONTACT_NO", "AGE", "SEX", "PROFILE_PICTURE","EMAIL","USERNAME","STATUS", "ABOUT")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning *`,
            [ROLE, NAME, encryptedPassword, 0, ADDRESS, CONTACT_NO, AGE, SEX, PROFILE_PICTURE, email, username, 0, " "]);

        // generate token
        const access = tokenGenerator(newUser.rows[0]);

        res.json({ access })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error")
    }
});

router.post("/login", validator, authorization, async (req, res) => {

    try {
        // reconstruct req.body
        const { email, password } = req.body;

        //check if exist
        const user = await pool.query(`select * from public.employees_account where "EMAIL" = $1`, [email])

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

router.post("/login-solo", validator, async (req, res) => {

    try {
        // reconstruct req.body
        const { email, password } = req.body;

        //check if exist
        const user = await pool.query(`select * from public.employees_account where "EMAIL" = $1`, [email])

        if (user.rows.length === 0) {
            return res.status(401).json("User Not found");
        }
        if (user.rows[0].CLINIC_ACCOUNT != 0) {
            return res.status(401).json("User is not a solo practitioner");
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



router.get("/get-user/:ID", validator, async (req, res) => {

    try {

        const { ID } = req.params;


        const user = await pool.query(`select * from public.employees_account where "ID" = $1`, [ID],);

        res.json(user.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/get-freelance", validator, async (req, res) => {

    try {
        const user = await pool.query(`select * from public.employees_account where "CLINIC_ACCOUNT" = 0`);

        res.json(user.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/get-services", validator, async (req, res) => {

    try {

        const user = await pool.query(`select * from public.services_offered`,);

        res.json(user.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/get-service/:ID", validator, async (req, res) => {

    try {
        const { ID } = req.params;
        const user = await pool.query(`SELECT s."ID", s."DESC"
        FROM public.employee_services e
        LEFT OUTER JOIN public.services_offered s ON e."SERVICES" = s."ID"
        WHERE e."EMPLOYEE" = $1
        `, [ID]);

        res.json(user.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.patch("/save-services/:ID", validator, async (req, res) => {



    try {
        const { ID } = req.params;
        const { servList } = req.body;

        const user = await pool.query(`DELETE FROM public.employee_services
        WHERE "EMPLOYEE" = $1;`, [ID]);
        console.log(servList);


        servList.map(async (value, index) => {
            await pool.query(`INSERT INTO public.employee_services(
               "EMPLOYEE", "SERVICES")
                VALUES ($1, $2);`, [ID, value.ID]);
        });

        res.json().status(200);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.patch("/save-about/:ID", validator, async (req, res) => {
    try {
        const { ID } = req.params;
        const { about } = req.body;

        const user = await pool.query(`UPDATE public.employees_account
        SET  "ABOUT"=$2
        WHERE "ID"=$1;`, [ID, about]);


        res.json().status(200);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});
module.exports = router;
