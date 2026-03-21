const express = require('express');
const { connectDB, Events, Bookings, Users } = require('./config/db');
const app = express();
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')


app.use(express.json());

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});


app.get('/api/events', async (req, res) => {
    try {
        const list = await Events.find({}, { __v: 0 }).catch((e) => console.log(e));
        // Uncomment if you want an empty list to return 404.
        // if (!list || list.length === 0) {
        //   return res.status(404).json({ message: "Event not found" });
        // }

        return res.status(200).json(list);
    } catch {
        return res.status(500).json({ message: "Server error" });
    }
})

app.get('/api/bookings/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params
        const list = await Bookings.find({ user: userId }).populate('event')
        const listFormat = list.map(l => ({
            _id: l._id,
            events: {
                name: l.event.name,
                date: l.event.date
            },
            quantity: l.quantity
        }))
        return res.status(200).json(listFormat)
    }
    catch (er) {

    }
});

app.get('/api/bookings/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params
        const list = await Bookings.findById(bookingId).populate('event').populate('user');
        if (!list) {
            return res.status(404).json({
                message: "Booking not found"
            })
        }
        const data = {
            _id: list._id,
            user: {
                _id: list.user._id,
                name: list.user.name,
                email: list.user.email
            },
            event: {
                _id: list.event._id,
                name: list.event.name,
                date: list.event.date,
                location: list.event.location
            }
        }
        return res.status(200).json(data)
    }
    catch (e) {
        return console.log(e)
    }
})

app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, eventId, quantity } = req.body;
        const checkEvent = await Events.findById(eventId);
        if (!checkEvent) {
            return res.status(404).json({
                message: 'Not found'
            })
        }
        if (checkEvent.availableTickets < quantity) {
            return res.status(404).json({
                message: 'Not enough'
            })
        }
        const newBooking = await Bookings.create({
            user: userId,
            event: eventId,
            quantity: quantity
        })
        const newAvailableTickets = checkEvent.availableTickets - quantity
        checkEvent.availableTickets = newAvailableTickets
        await checkEvent.save()
        return res.status(201).json(newBooking)
    }
    catch (e) {

    }
})
const key = process.env.JWT_SECRET
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const checkUser = await Users.findOne({ email });
        if (!checkUser) {
            return res.json({
                message: 'Invalid credentials'
            })
        }
        const checkPassword = await bcrypt.compare(password, checkUser.password);
        if (!checkPassword) {
            return res.json({
                message: 'Invalid credentials'
            })
        }
        const token = jwt.sign({
            email,
            password
        }, key, { expiresIn: '1h' });
        return res.json({
            token: token
        })
    }
    catch (e) {
        return console.log(e)
    }
})


const PORT = process.env.PORT || 9999;
app.listen(PORT, async () => {
    await connectDB()
    console.log(`Server running on port ${PORT}`)
});