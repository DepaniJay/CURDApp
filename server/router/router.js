const express = require('express');
const app = express();
const router = new express.Router();
const bcryptjs = require('bcryptjs');
const cookieParser = require('cookie-parser');
const Userdata = require('../module/users');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

app.use(cookieParser());
router.use(express.static(path.join(__dirname,"../../public/")));


router.get('/',(req,res)=>{
    res.render('index');
});

router.get('/register',(req,res)=>{
    res.render('register');
});

router.get('/login',(req,res)=>{
    res.render('login');
});

router.get("/profile",auth,(req,res)=>{

    let id = req.user._id;
    let name = req.user.name;
    let useremail = req.user.email;
    let userphoneno = req.user.phone;
    let imagename = req.user.profileImg;
    let gender = req.user.gender;

    res.render('profile',{
        id,name,useremail,userphoneno,imagename,gender
    });
});

router.get('/editProfile',auth,(req,res)=>{

    let id = req.user._id;
    let name = req.user.name;
    let useremail = req.user.email;
    let userphoneno = req.user.phone;
    let gender = req.user.gender;

    res.render('editProfile',{
        id,name,useremail,userphoneno,gender
    });
});

var Storage = multer.diskStorage({
    destination:"public/profileImages",
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname));
    }
});

var upload = multer({
    storage:Storage
}).single('filename'); 

router.post('/register',upload,async (req,res)=>{
    try {
        const password = req.body.password;
        const cpassword = req.body.cpassword;
        if(password === cpassword){
            
            const userRegister = new Userdata({
                name:req.body.name,
                email:req.body.email,
                phone:req.body.phone,
                profileImg:req.file.filename,
                gender:req.body.gender,
                password,cpassword
            });

            const register = await userRegister.save();
            if(register){
                const userData = await Userdata.findOne({email:req.body.email});
                req.session.userID = userData._id;
            }

            res.status(201).render('login');
            
        }else{
            res.send('password are not matching');
        }
        
    } catch (error) {
        console.log(error);
    }
});



router.post('/edituserdata/:id',upload,async (req,res)=>{
    try {
        let _id = req.params.id;
        if(req.body.password){
            const password = req.body.password;
            const cpassword = req.body.cpassword;
    
            if(password === cpassword){
                let pass = await bcryptjs.hash(password,10);
                let cpass = await bcryptjs.hash(cpassword,10);
                let result='';
                if(req.file){
                    result = await Userdata.findByIdAndUpdate({_id},{
                        name:req.body.name,
                        email:req.body.email,
                        phone:req.body.phone,
                        gender:req.body.gender,
                        profileImg:req.file.filename,
                        password:pass,
                        cpassword:cpass  
                    },{new:true});
    
                }else{
                    result = await Userdata.findByIdAndUpdate({_id},{
                        name:req.body.name,
                        email:req.body.email,
                        phone:req.body.phone,
                        gender:req.body.gender,
                        password:pass,
                        cpassword:cpass 
                    },{new:true});
                }
                res.redirect('/profile');
                
            }else{
                res.send('password are not matching');
            }
        }else{
            let result='';
            if(req.file){
                result = await Userdata.findByIdAndUpdate({_id},{
                    name:req.body.name,
                    email:req.body.email,
                    phone:req.body.phone,
                    gender:req.body.gender,
                    profileImg:req.file.filename  
                },{new:true});

            }else{
                result = await Userdata.findByIdAndUpdate({_id},{
                    name:req.body.name,
                    email:req.body.email,
                    phone:req.body.phone,
                    gender:req.body.gender,  
                },{new:true});
            }
            res.redirect('/profile');
        }
        
    } catch (error) {
        console.log(error);
    }
});



router.post('/login',async(req,res)=>{
    try{
        const email = req.body.email;
        const password = req.body.password;

        const userData = await Userdata.findOne({email});

        if(userData != null){
            const isMatch = await bcryptjs.compare(password,userData.password);
            if(isMatch){
                const token = await userData.generateToken();
                req.session.userID = userData._id;

                res.cookie('token',token,{
                    expires:new Date(Date.now() + 86400000),
                    httpOnly:true
                });

                res.status(200).render('index');
            }else{
                res.send('Password are not matching');
            }
        }else{
            res.send('Email are not matching');
        }
    }catch(error){
        res.status(500).send(error);
    }
});

router.get("/logout",auth,async(req,res)=>{
    try {
        req.user.tokens = req.user.tokens.filter((element)=>{
            return element.token != req.token;
        });

        res.clearCookie('token');
        req.session.destroy();

        await req.user.save();
        res.render('login');
    } catch (error) {
        res.status(500).send(error)
    }
});

module.exports = router;