const pool = require("../config/db");
const router = require("express").Router();
const authorization = require("../middleware/authorization")

router.post("/book-appointment", validator, async (req, res) => {

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
        const access = tokenGenerator(user.rows[0].ID);

        res.json({ access })

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }


});




module.exports = router;
