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
        const { username, email, password, name } = req.body;

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
            "EMAIL", "USERNAME", "PASSWORD", "NAME", "BIO", "PICTURE")
            VALUES ($1, $2, $3, $4, $5, $6) returning *`,
            [email, username, encryptedPassword, name, ' ', ' ']);

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

router.get("/get-clinics", validator, async (req, res) => {

    try {
        const users = await pool.query(`SELECT *
        FROM public.clinic_account
        WHERE "STATUS" = 1`)


        res.json(users.rows)

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
        const users = await pool.query(`SELECT *
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

router.get("/get-user/:ID", validator, async (req, res) => {

    try {

        const { ID } = req.params;


        const user = await pool.query(`select * from public.clinic_account where "ID" = $1`, [ID],);

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
        FROM public.clinic_services e
        LEFT OUTER JOIN public.services_offered s ON e."SERVICES" = s."ID"
        WHERE e."CLINIC" = $1
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

        const user = await pool.query(`DELETE FROM public.clinic_services
        WHERE "CLINIC" = $1;`, [ID]);
        console.log(servList);


        servList.map(async (value, index) => {
            await pool.query(`INSERT INTO public.clinic_services(
               "CLINIC", "SERVICES")
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

        const user = await pool.query(`UPDATE public.clinic_account
        SET  "BIO"=$2
        WHERE "ID"=$1;`, [ID, about]);


        res.json().status(200);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});


router.get("/get-materials/:ID", validator, async (req, res) => {

    try {
        const { ID } = req.params;
        const materials = await pool.query(`
        SELECT * FROM public.clinic_materials
        WHERE "CLINIC" = $1`, [ID]);


        const resList = await Promise.all(materials.rows.map(async (material) => {
            const files = await pool.query(`
                SELECT *
                FROM public.clinic_files
                WHERE "MATERIAL" = $1`, [material.ID]);

            material.FILES = files.rows;

            return material;
        }));

        res.json(resList);

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.post("/add-materials", async (req, res) => {
    try {
        const { title, desc, thumbnail, clinic } = req.body;

        const booking = await pool.query(`INSERT INTO public.clinic_materials(
            "TITLE", "DESC", "THUMBNAIL", "CLINIC")
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, desc, thumbnail, clinic])

        return res.send(booking.rows);

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.post("/add-attatchments", async (req, res) => {
    try {
        const { material, type, file } = req.body;

        const booking = await pool.query(`INSERT INTO public.clinic_files(
            "MATERIAL", "TYPE", "FILE")
            VALUES ($1, $2, $3) RETURNING *`,
            [material, type, file])

        return res.send(booking.rows[0]);

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.get("/get-attatchments/:type/:material/:parent", async (req, res) => {
    try {
        const { type, material, parent } = req.params;

        const booking = await pool.query(`INSERT INTO public.clinic_files(
            "MATERIAL", "TYPE", "FILE")
            VALUES ($1, $2, $3) RETURNING *`,
            [material, type, file])

        return res.send(booking.rows[0]);

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

module.exports = router;