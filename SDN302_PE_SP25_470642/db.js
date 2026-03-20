const categoriesResData = categoriesList.map((i) => ({
    name: i.name,
    description: i.description
}));

const customersResData = customersList.map((i) => ({
    name: i.name,
    email: i.email,
    password: i.password,
    address: i.address,
    phone: i.phone
}));

const ordersResData = ordersList.map((i) => ({
    customerId: i.customerId,
    products: i.products?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      })) ?? [],
    totalPrice: i.totalPrice,
    orderDate: i.orderDate
}));

const productsResData = productsList.map((i) => ({
    name: i.name,
    price: i.price,
    stock: i.stock,
    category: i.category
}));
