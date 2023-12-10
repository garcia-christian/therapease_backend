const pool = require("../config/db");
const router = require("express").Router();
const authorization = require("../middleware/authorization")

router.post("/book-appointment", async (req, res) => {
    try {
        // reconstruct req.body
        const { timeslot, clinic, parent, therapist, status, note } = req.body;
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
            "PARENT", "DATEBOOKED", "TIMESLOT", "CLINIC", "THERAPIST", "STATUS","NOTE")
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6);`,
            [parent, timeslot, clinic, therapist, status, note])

        res.send('booked');

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error")
    }
});

router.get("/get-appointment/:clinic/:status", async (req, res) => {
    try {
        const { clinic } = req.params;
        const { status } = req.params;
        let appointment = [];

        if (status == 3) {
            appointment = await pool.query(`
                SELECT b.*, t."DATE"
                FROM public.booking b
                LEFT OUTER JOIN public.timeslot t on b."TIMESLOT" = t."ID"
                WHERE "STATUS" = $2 and "THERAPIST" = $1 `,
                [clinic, status]);
        } else if (status == 1) {
            appointment = await pool.query(`
            SELECT b.*, t."DATE"
            FROM public.booking b
            LEFT OUTER JOIN public.timeslot t on b."TIMESLOT" = t."ID"
            WHERE "STATUS" = $1 and "THERAPIST" = 0`,
                [status]);
        } else {
            appointment = await pool.query(`
                SELECT b.*, t."DATE"
                FROM public.booking b
                LEFT OUTER JOIN public.timeslot t on b."TIMESLOT" = t."ID"
                WHERE "STATUS" = $2 and "THERAPIST" = $1`,
                [clinic, status]);
        }




        const resList = await Promise.all(appointment.rows.map(async (appointmentRow) => {
            const parent = await pool.query(`
                SELECT *
                FROM public.parent_account
                WHERE "ID" = $1`, [appointmentRow.PARENT]);

            const timeSlot = await pool.query(`
                SELECT *
                FROM public.timeslot
                WHERE "ID" = $1`, [appointmentRow.TIMESLOT]);

            const therapist = await pool.query(`
                SELECT *
                FROM public.employees_account
                WHERE "ID" = $1`, [appointmentRow.THERAPIST]);

            const clinicAcc = await pool.query(`
                SELECT *
                FROM public.clinic_account
                WHERE "ID" = $1`, [appointmentRow.CLINIC]);

            const responseData = {
                "ID": appointmentRow.ID,
                "DATEBOOKED": appointmentRow.DATEBOOKED,
                "PARENT": parent.rows[0], // Assuming there is only one parent for each appointment
                "TIMESLOT": timeSlot.rows[0], // Assuming there is only one timeslot for each appointment
                "CLINIC": clinicAcc.rows[0], // Assuming there is only one clinic account for each appointment
                "THERAPIST": therapist.rows[0], // Assuming there is only one therapist for each appointment
                "STATUS": appointmentRow.STATUS,
                "NOTE": appointmentRow.NOTE,
            };
            return responseData;
        }));

        return res.send(resList);
    } catch (error) {
        console.error(error.message);
        res.status(500).send(error.message);
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


router.put("/accept-booking/:id/:therapist", async (req, res) => {
    try {
        const { id } = req.params;
        const { therapist } = req.params;

        const booking = await pool.query(`UPDATE public.booking
        SET "THERAPIST"= $2, "STATUS" = 2 
        WHERE "ID"= $1;`, [id, therapist]);
        return res.send('Update');

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
                SELECT "ID","CLINIC","DATE","START_TIME", "END_TIME"
                FROM public.timeslot
                WHERE "DATE"::date = $1`, [value.day]);

            timeSlots.push({
                DATE: value.day,
                TIMESLOT: time.rows
            });
        }));

        res.send(timeSlots)

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.get("/get-solo-timeslots/:id", async (req, res) => {

    try {
        const { id } = req.params;
        const dates = await pool.query(`
            SELECT TO_CHAR("DATE"::date, 'YYYY-MM-DD') AS day
            FROM public.timeslot
            WHERE "CLINIC" = 0
            GROUP BY day
            ORDER BY day;`)
        let timeSlots = []
        await Promise.all(dates.rows.map(async (value) => {
            let time = await pool.query(`
                SELECT "ID","CLINIC","DATE","START_TIME", "END_TIME"
                FROM public.timeslot
                WHERE "DATE"::date = $1`, [value.day]);

            timeSlots.push({
                DATE: value.day,
                TIMESLOT: time.rows
            });
        }));

        res.send(timeSlots)

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

router.get("/get-parent-appointments/:ID", async (req, res) => {

    try {
        const { ID } = req.params;

        const timeSlotID = await pool.query(`
            SELECT  "ID", "TIMESLOT"
            FROM public.booking
            WHERE "PARENT" = $1`, [ID])


        let timeSlots = []
        await Promise.all(timeSlotID.rows.map(async (timeValue) => {
            let dates = await pool.query(`
                SELECT TO_CHAR("DATE"::date, 'YYYY-MM-DD') AS day
                FROM public.timeslot
                WHERE "ID" = $1
                GROUP BY day
                ORDER BY day;`, [timeValue.TIMESLOT])
            console.log(dates.rows[0]);

            let time = await pool.query(`
            SELECT "ID","CLINIC","DATE","START_TIME", "END_TIME"
            FROM public.timeslot
            WHERE "ID" = $1`, [timeValue.TIMESLOT]);

            let clinic = [];
            if (time.rows.length > 0) {
                clinic = await pool.query(`
            SELECT *
            FROM public.clinic_account
            WHERE "ID" = $1`, [time.rows[0].CLINIC]);
            }

            // Update the BOOKING and CLINIC properties if there is clinic data
            if (time.rows.length > 0 && clinic.rows.length > 0) {
                time.rows[0].BOOKING = timeValue.ID;
                time.rows[0].CLINIC = clinic.rows[0];

                timeSlots.push({
                    DATE: dates.rows[0].day,
                    TIMESLOT: time.rows,
                });
            }

        }));





        res.send(timeSlots)

    } catch (error) {
        console.error(error.message)
        res.status(500).send(error.message)
    }
});

module.exports = router;
