const pool = require("../config/db");
const router = require("express").Router();
const authorization = require("../middleware/authorization")

router.post("/book-appointment", async (req, res) => {
    try {
        // reconstruct req.body
        const { timeslot, clinic, parent } = req.body;
        //Booking status 1 = pending/unaproved, 2 = approved, 3 = rejected, 4 = done;

        const chkTimeslot = await pool.query(`SELECT * FROM public.timeslot
            WHERE "CLINIC" = $1 AND "ID" = $2`,
            [clinic, timeslot]);

        if (!chkTimeslot.rows != 0) {
            return res.send('Timeslot Does not Exist')
        }

        const booking = await pool.query(`
             SELECT * FROM public.booking
             WHERE "CLINIC" = $1 and "TIMESLOT" = $2 and "STATUS" > 1`,
            [clinic, timeslot])

        if (booking.rows != 0) {
            return res.send('Unavailable')
        }

        const appointment = await pool.query(`INSERT INTO public.booking(
            "PARENT", "DATEBOOKED", "TIMESLOT", "CLINIC", "THERAPIST", "STATUS")
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5);`,
            [parent, timeslot, clinic, 0, 1])

        res.send('booked');

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});


router.post("/add-timeslot", async (req, res) => {
    try {
        const { clinic, date, start_time, end_time } = req.body;

        const Start = new Date(start_time);
        const End = new Date(end_time);


        if (!(End >= Start)) {
            res.send("End time cannot be earlier than Start time");
            return;
        }

        const booking = await pool.query(`INSERT INTO public.timeslot(
             "CLINIC", "DATE", "START_TIME", "END_TIME")
            VALUES ($1, $2, $3, $4);`,
            [clinic, date, Start.getTime(), End.getTime()])

        res.send('created')

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.get("/get-timeslots/:apdate/:clinic", async (req, res) => {
    try {
        const { apdate } = req.params;
        const { clinic } = req.params;
        const user = await pool.query(`   SELECT "ID", "CLINIC", "DATE", "START_TIME", "END_TIME"
        FROM public.timeslot
            WHERE "DATE" = $1 AND "CLINIC" = $2`, [apdate, clinic])
        res.send(user.rows)

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});


module.exports = router;
