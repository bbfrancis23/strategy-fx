import mongoose, {mongo} from 'mongoose'

const memberSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true},
  password: {type: String, required: false},
  name: {type: String, required: false},
  phone: {type: String, required: false},
  emailAuth: {type: Boolean, required: false},
  phoneAuth: {type: Boolean, required: false},
  authCode: {type: String, required: false},
  authTime: {type: Date, required: false},
  invalidCount: {type: Number, required: false},
  locked: {type: Boolean, required: false},
  favoriteItems: [{type: String, required: false}],
  image: {type: String, required: false},
})

const Member = mongoose.models.members || mongoose.model('members', memberSchema)

export default Member

// QA: done 8-4-23
