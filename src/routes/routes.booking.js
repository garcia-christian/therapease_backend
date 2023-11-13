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


function convertToDateTime(timeString) {
    // Split the time string into hours, minutes, and seconds
    var timeComponents = timeString.split(':');

    // Create a new Date object with the current date and set the time components
    var dateTime = new Date();
    dateTime.setHours(parseInt(timeComponents[0], 10));
    dateTime.setMinutes(parseInt(timeComponents[1], 10));
    dateTime.setSeconds(parseInt(timeComponents[2], 10));

    return dateTime;
}

router.post("/add-timeslot", async (req, res) => {
    try {
        const { clinic, date, start_time, end_time } = req.body;

        const Start = convertToDateTime(start_time);
        const End = convertToDateTime(end_time);
        console.log(Start);
        console.log(End);
        if (!(End >= Start)) {
            return res.status(400).send('Invalid Time Range')
        }

        const booking = await pool.query(`INSERT INTO public.timeslot(
             "CLINIC", "DATE", "START_TIME", "END_TIME")
            VALUES ($1, $2, $3, $4) RETURNING *;`,
            [clinic, date, start_time, end_time])
        console.log(booking.rows);
        return res.send(booking.rows[0]);

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.delete("/remove-timeslot/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await pool.query(`DELETE FROM public.timeslot
        WHERE "ID" = $1;`, [id])
        return res.send('deleted');

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});
router.get("/get-timeslots/:clinic", async (req, res) => {

    try {
        const { clinic } = req.params;
        const dates = await pool.query(`
            SELECT TO_CHAR("DATE"::date, 'YYYY-MM-DD') AS day
            FROM public.timeslot
            WHERE "CLINIC" = $1
            GROUP BY day
            ORDER BY day;`, [clinic])
        let timeSlots = []
        await Promise.all(dates.rows.map(async (value) => {
            let time = await pool.query(`
                SELECT "ID", "DATE","START_TIME", "END_TIME"
                FROM public.timeslot
                WHERE "DATE"::date = $1`, [value.day]);

            timeSlots.push({
                DATE: value.day,
                TIMESLOT: time.rows
            });
        }));
        console.log(timeSlots);
        res.send(timeSlots)

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});


module.exports = router;
