const bookingsResData = bookingsList.map((i) => ({
    user: i.user,
    event: i.event,
    quantity: i.quantity
}));

const eventsResData = eventsList.map((i) => ({
    name: i.name,
    description: i.description,
    date: i.date,
    location: i.location,
    availableTickets: i.availableTickets
}));

const usersResData = usersList.map((i) => ({
    name: i.name,
    email: i.email,
    password: i.password
}));
