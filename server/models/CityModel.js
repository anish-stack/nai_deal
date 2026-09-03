const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
    cityName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    image:{
        url:{
            type:String,
        },
        public_id:{
            type:String,
        }
    },
    position:{
        type: Number,
        unique:true
    },
    isShowOnHomeScreen:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

module.exports = mongoose.model('City', CitySchema);
