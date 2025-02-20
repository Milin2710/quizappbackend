const mongoose = require('mongoose');
const {Schema, model} = mongoose

const AdminSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
})

const AdminModel = model('Admin', AdminSchema)

module.exports = AdminModel;