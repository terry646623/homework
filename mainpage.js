var express=require("express");
var session=require("cookie-session");
var bodyParser=require("body-parser");
var mongoClient=require("mongodb").MongoClient;
var ObjectId = require('mongodb').ObjectId; 
var fileUpload=require("express-fileupload");

var app=express();
var mongourl="mongodb://localhost:27017/test";

app.use(fileUpload());
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:false}));
app.use(session({name:"session",keys:["key1","key2"]}));

function readUserInformation(db,callback){ //read the user information from the database
	var userInformation=[];
	var cursor=db.collection("User").find();
	cursor.each(function(err,doc){
		if(doc!=null)
			userInformation.push(doc);
		else
			callback(userInformation); //return all user information as an array
	})
}

function readRestaurantInformation(db,query,callback){ //read the restaurant information from the database
	var restaurantInformation=[];
	console.log(query);
	if(query==null) //find all restaurant information
		var cursor=db.collection("Restaurant").find().sort({"_id":1});
	else //get the restaurant information based on the criteria
		var cursor=db.collection("Restaurant").find(query).sort({"_id":1});
	cursor.each(function(err,doc){
		if(doc!=null)
			restaurantInformation.push(doc);
		else
			callback(restaurantInformation); //return the restaurant information as an array
	})
}

function getSingleRestaurant(db,anid,callback){ //read the single restaurant object by the id
	var restaurantInformation;
	console.log(anid);
	var cursor=db.collection("Restaurant").find(ObjectId(anid));
	cursor.each(function(err,doc){
		if(doc!=null)
			restaurantInformation=doc;
		else
			callback(restaurantInformation); //return single restaurant information 
	})
}

function checkUser(inputname,inputpass,userInformation){ //check whether the user input is correct
	for(index in userInformation){ 
		if(inputname==userInformation[index]["username"]){
			if(inputpass==userInformation[index]["password"])
				return true; //the username and password are correct
			else continue; //username is correct but the password is wrong
		}
		else continue; //the username is wrong
	}
	return false; //no matching username and password combination
}

function isRated(username,rateArray){ //check whether the user has rated the restaurant
	for(index in rateArray){
		if(username==rateArray[index]["rater"])
			return true;
	}
	return false;
}

function createRestaurant(req,callback){

	var restaurant={}; //generate the restaurant object
	restaurant["address"]={};
	restaurant["address"]["gps"]=[null,null];
	var rating={};
	restaurant["ratingArray"]=[];

	restaurant["name"]=req.body.aname;
	restaurant["cuisine"]=(req.body.cuisine!="")?req.body.cuisine:null;
	
	restaurant["address"]["borough"]=(req.body.borough!="")?req.body.borough:null;
	restaurant["address"]["street"]=(req.body.street!="")?req.body.street:null;
	restaurant["address"]["building"]=(req.body.building!="")?req.body.building:null;
	restaurant["address"]["zipcode"]=(req.body.code!="")?parseInt(req.body.code):null;
	restaurant["address"]["gps"][0]=(req.body.lon!="")?parseFloat(req.body.lon):null;
	restaurant["address"]["gps"][1]=(req.body.lat!="")?parseFloat(req.body.lat):null;

	restaurant["picture"]=(req.files.picture.name!='')?new Buffer(req.files.picture.data).toString("base64"):null;
	restaurant["mimetype"]=(req.files.picture!=null)?req.files.picture.mimetype:null;

	rating["rater"]=(req.body.rate!=null)?req.session.username:null;
	rating["score"]=(req.body.rate!=null)?parseInt(req.body.rate):null;
	if(!isNaN(rating["score"]))
		restaurant["ratingArray"].push(rating);

	restaurant["creater"]=req.session.username; //get the creater by the cookie object
		
	mongoClient.connect(mongourl,function(err,db){
		result=db.collection("Restaurant").insert(restaurant); //insert the restaurant into the database
		db.close();
		callback(restaurant);
	})	
}

function updateRestaurant(req,callback){ 

	var query={"name":null,"cuisine":null,"address.borough":null,"address.street":null,"address.building":null,
	           "address.zipcode":null,"address.gps.0":null,"address.gps.1":null,"picture":null,
	           "mimetype":null}; //this is the updated query template
	var rating={};

	(req.body.aname!="")?query["name"]=req.body.aname:delete query["name"];
	(req.body.cuisine!="")?query["cuisine"]=req.body.cuisine:delete query["cuisine"];
	
	(req.body.borough!="")?query["address.borough"]=req.body.borough:delete query["address.borough"];
	(req.body.street!="")?query["address.street"]=req.body.street:delete query["address.street"];
	(req.body.building!="")?query["address.building"]=req.body.building:delete query["address.building"];
	(req.body.code!="")?query["address.zipcode"]=req.body.code:delete query["address.zipcode"];
	(req.body.lon!="")?query["address.gps.0"]=req.body.lon:delete query["address.gps.0"];
	(req.body.lat!="")?query["address.gps.1"]=req.body.lat:delete query["address.gps.1"];

	if(req.files.picture.name!='')
		query["picture"]=new Buffer(req.files.picture.data).toString("base64");
	else{
		delete query["picture"];
		delete query["mimetype"];
	}

	callback(query); //return the query set for the update function
}

function printConfirm(restaurant){ //just for printing the addition restaurant object
	
	var message='<ul><li>Name: '+restaurant["name"]+"</li>";
	if(restaurant["cuisine"]!=null)
		message+='<li>Cuisine: '+restaurant["cuisine"]+"</li>";
	if(restaurant["address"]["borough"]!=null)
		message+='<li>Borough: '+restaurant["address"]["borough"]+"</li>";
	if(restaurant["address"]["street"]!=null)
		message+='<li>Street: '+restaurant["address"]["street"]+"</li>";
	if(restaurant["address"]["building"]!=null)
		message+='<li>Building: '+restaurant["address"]["building"]+"</li>";
	if(restaurant["address"]["zipcode"]!=null)
		message+='<li>Zipcode: '+restaurant["address"]["zipcode"]+"</li>";

	var lon=(restaurant["address"]["gps"][0]!=null)?restaurant["address"]["gps"][0]:"";
	var lat=(restaurant["address"]["gps"][1]!=null)?restaurant["address"]["gps"][1]:"";
	if(lon!=""||lat!="")
		message+='<li>GPS Coordinates: ['+lon+','+lat+"]</li>";

	if(restaurant["picture"]!=null)
		message+='<li>File: <img src="data:'+restaurant["mimetype"]+';base64,'+restaurant["picture"]+
		 	 	     '" width="64" height="64"></li>';
	if(restaurant["ratingArray"].length!=0)
		message+='<li>Rating: '+restaurant["ratingArray"][0]["rater"]+
			 	      '-('+restaurant["ratingArray"][0]["score"]+')</li></ul>';
	return message;
}

function getejs(restaurantInformation){ //get the ejs object for generating the restaurant information

	var ejsObj={ejsname:restaurantInformation["name"],
		    ejscuisine:(restaurantInformation["cuisine"]!=null)?
				restaurantInformation["cuisine"]:"NoData",
		    ejsborough:(restaurantInformation["address"]["borough"]!=null)?
				restaurantInformation["address"]["borough"]:"NoData",
		    ejsstreet:(restaurantInformation["address"]["street"]!=null)?
			       restaurantInformation["address"]["street"]:"NoData",
		    ejszipcode:(restaurantInformation["address"]["zipcode"]!=null)?
				restaurantInformation["address"]["zipcode"]:"NoData",
		    ejslon:(restaurantInformation["address"]["gps"][0]!=null)?
				restaurantInformation["address"]["gps"][0]:"NoData",
		    ejslat:(restaurantInformation["address"]["gps"][1]!=null)?
				restaurantInformation["address"]["gps"][1]:"NoData",
	            ejsratearray:JSON.stringify(restaurantInformation["ratingArray"]),
		    ejscreater:restaurantInformation["creater"],
		    ejspicture:(restaurantInformation["picture"]!=null)?
				restaurantInformation["picture"]:"NoImage",
		    ejspicturetype:restaurantInformation["mimetype"],
		    ejsindex:restaurantInformation["_id"]};
	
	return ejsObj;
}

app.get("/login",function(req,res){ //login page
	if(req.session.authentic)
		res.redirect("/mainpage");
	var message='<html><body><h1>User Log In</h1>';
	message+='<form action="http://localhost:8099/authentic" method="post">';
	message+='User Name:<input type="textfield" name="aname"><br>';
	message+='Password:<input type="password" name="pass"><br>';
	message+='<input type="submit" value="Submit"></form>';
	message+='</body></html>';
	res.send(message);
})

app.post("/authentic",function(req,res){ //user information checking
	var inputname=req.body.aname;
	var inputpass=req.body.pass;
	mongoClient.connect(mongourl,function(err,db){
		readUserInformation(db,function(userInformation){
			if(checkUser(inputname,inputpass,userInformation)){ //if the login successful
				req.session.username=inputname;
				req.session.authentic=true;
				db.close();
				res.redirect("/mainpage"); //go to the mainpage 
			}
			else{ //if the login failed
				db.close();
				res.redirect("/error"); //go to the error page to let the user to login again
			}
		})
	})
})


app.get("/error",function(req,res){ //incorrect user page
	var message='<html><body><h1>Incorrect username or password!!!</h1>';
	message+='<form action="/login" method="get">'
	message+='<input type="submit" value="Back To Login Page"></form>'
	message+='</body></html>'
	res.send(message);
})

app.get("/mainpage",function(req,res){ //the mainpage of the website
	if(!req.session.authentic)
		res.redirect("/login");
	var message='<html><body><h1>Mainpage</h1>';
	message+='<h2>Select your action</h2>';
	message+='User name: '+req.session.username+'<br><br>';
	message+='<form action="/create" method="get">';
	message+='<input type="submit" value="Create Restaurant"></form><br>'; //let the user to create new restaurant 
	message+='<form action="/read" method="get">';
	message+='<input type="submit" value="All Restaurant">'; //get all restaurant content
	message+='<input type="hidden" name="aquery" value="novalue"></form><br>';
	message+='<form action="/search" method="get">';
	message+='<input type="submit" value="Search Restaurant"></form><br>'; //search the restaurant content based on criteria
	message+='<form action="/logout" method="get">';
	message+='<input type="submit" value="Logout"></form><br>'; //log out and clear the cookie session
	res.send(message);
})

app.get("/search",function(req,res){ //a search form for generate the criteria
	if(!req.session.authentic)
		res.redirect("/login");
	var message='<html><body><h1>Search Restaurant Information</h1>';
	message+='<form action="/read" method="get">';
	message+='Name:<input type="textfield" name="aname"><br>';
	message+='Borough:<input type="textfield" name="borough"><br>';
	message+='Cuisine:<input type="textfield" name="cuisine"><br>';
	message+='<input type="submit" value="Submit"></form>';
	message+='<form action="/mainpage" method="get">';
	message+='<input type="submit" value="Back To Mainpage"></form>';
	res.send(message);
})

app.get("/create",function(req,res){ //form of create a restaurant object
	if(!req.session.authentic)
		res.redirect("/login");
	var message='<html><body><h1>Create Restaurant Information</h1>';
	message+='<form action="/createconfirm" method="post" enctype="multipart/form-data">';
	message+='Name:<input type="textfield" name="aname" required><br>';
	message+='Cuisine:<input type="textfield" name="cuisine"><br><hr>';
	message+='Borough:<input type="textfield" name="borough"><br>';
	message+='Street:<input type="textfield" name="street"><br>';
	message+='Building:<input type="textfield" name="building"><br>';
	message+='Zipcode:<input type="textfield" name="code"><br><hr>';
	message+='GPS Coordinates(lon):<input type="textfield" name="lon"><br>';
	message+='GPS Coordinates(lat):<input type="textfield" name="lat"><br><hr>';
	message+='File:<input type="file" name="picture" accept="image/*"><br><br>';
	message+='Rating(1-10):<input type="number" min="1" max="10" name="rate"><br>';
	message+='<input type="submit" value="Submit"></form><br>';
	message+='<form action="/mainpage" method="get">';
	message+='<input type="submit" value="Back To Mainpage"></form><br>';
	res.send(message);
})

app.post("/createconfirm",function(req,res){ //print the restaurant object which the user created
	if(!req.session.authentic)
		res.redirect("/login");
	createRestaurant(req,function(restaurant){
		var message='<html><body><h1>Create Restaurant Successfully</h1>';
		message+=printConfirm(restaurant);
		message+='<form action="/create" method="get">';
		message+='<input type="submit" value="Back To Create Page"></form><br>';
		res.send(message);});
})



app.post("/updateconfirm",function(req,res){ //update the restaurant based on the generated query
	if(!req.session.authentic)
		res.redirect("/login");
	updateRestaurant(req,function(query){
		mongoClient.connect(mongourl,function(err,db){
			console.log(query);
			db.collection("Restaurant").update({_id:ObjectId(req.body.index)},{$set:query}); 
			var message='<html><body><h1>Update Restaurant Successfully</h1>';
			getSingleRestaurant(db,req.body.index,function(restaurantInformation){
				message+='<form action="/restaurantInformation" method="get">';
				message+='<input type="submit" value="Back To Restaurant Information">'
				message+='<input type="hidden" name="index" value="'+req.body.index+'"></form><br>';
				db.close();
				res.send(message);
			});
		  });
	});
});

app.get("/deleteconfirm",function(req,res){ //remove the restaurant object of the current information page
	if(!req.session.authentic)
		res.redirect("/login");
	mongoClient.connect(mongourl,function(err,db){

		getSingleRestaurant(db,req.query.index,function(restaurantInformation){

			if(req.session.username==restaurantInformation["creater"]){ //only the creater can delete the restaurant
				db.collection("Restaurant").remove({_id:ObjectId(req.query.index)}); 
				db.close();
				var message='<html><body><h1>Remove Restaurant Successfully</h1>';
				message+='<form action="/read" method="get">';
				message+='<input type="submit" value="Back To All Restaurant">';
				message+='<input type="hidden" name="aquery" value="novalue"></form><br>';
				message+='</body></html>';
				res.send(message);
			}
			
			else{
				db.close();
				var message='<html><body><h1>Sorry! You have no authorized to delete</h1>';
				message+='<form action="/restaurantInformation" method="get">';
				message+='<input type="hidden" name="index" value="'+req.query.index+'">';
				message+='<input type="submit" value="Back To Restaurant Information"></form>';
				res.send(message);
			}
		})
	})
})

app.post("/rateconfirm",function(req,res){ //add the rating of the user to the rating array
	if(!req.session.authentic)
		res.redirect("/login");
	var rating={};
	rating["rater"]=req.session.username;
	rating["score"]=req.body.rate;
	console.log(JSON.stringify(rating));
	mongoClient.connect(mongourl,function(err,db){
		db.collection("Restaurant").update({_id:ObjectId(req.body.index)},{$push:{"ratingArray":rating}});
		db.close();
		var message='<html><body><h1>Rate Restaurant Successfully</h1>';
		message+='<form action="/restaurantInformation" method="get">';
		message+='<input type="submit" value="Back To Restaurant Information">';
		message+='<input type="hidden" name="index" value="'+req.body.index+'"></form><br>';
		message+='</body></html>';
		res.send(message);	
	})
})

app.get("/read",function(req,res){ //List out all the restaurant or the restaurant based on the criteria
	if(!req.session.authentic)
		res.redirect("/login");
	mongoClient.connect(mongourl,function(err,db){

		if(req.query.aquery!="novalue"){ 
			var query={"name":null,"cuisine":null,"address.borough":null};
			(req.query.aname!="")?query["name"]=req.query.aname:delete query["name"];
			(req.query.cuisine!="")?query["cuisine"]=req.query.cuisine:delete query["cuisine"];
			(req.query.borough!="")?query["address.borough"]=req.query.borough:delete query["address.borough"];}
		else
			var query=null;
		
		readRestaurantInformation(db,query,function(restaurantInformation){ 
			db.close();
			var message='<html><body><h1>Total '+restaurantInformation.length+' Restaurant Information</h1><ol>';
			for(index in restaurantInformation){ //add the hyperlink with the index query
				message+='<a href="/restaurantInformation?index=';
				message+=restaurantInformation[index]["_id"]+'"><li>'
				message+=restaurantInformation[index]["name"]+'</a></li>';
			}
			message+='</ol>';
			message+='<form action="/mainpage" method="get">';
			message+='<input type="submit" value="Back To Mainpage"></form><br></body></html>';	
			res.send(message);	
		})
	})	
})

app.get("/api/read/name/:name",function(req,res){ //search the restaurant based on the name
	
	mongoClient.connect(mongourl,function(err,db){
		
		var query={"name":null};
		(req.params.name!="")?query["name"]=req.params.name:delete query["name"];
		
		readRestaurantInformation(db,query,function(restaurantInformation){
			db.close();
			if(restaurantInformation.length!=0){
				res.json(restaurantInformation);
				res.end();}
			else{
				res.json({});
				res.end();}
		})
	})
})

app.get("/api/read/borough/:borough",function(req,res){ //search the restaurant based on the borough
	
	mongoClient.connect(mongourl,function(err,db){
		
		var query={"address.borough":null};
		(req.params.borough!="")?query["address.borough"]=req.params.borough:delete query["address.borough"];
		
		readRestaurantInformation(db,query,function(restaurantInformation){
			db.close();
			if(restaurantInformation.length!=0)
				res.json(restaurantInformation);
			else
				res.json({});
		})
	})
})

app.get("/api/read/cuisine/:cuisine",function(req,res){ //search the restaurant based on the cuisine
	
	mongoClient.connect(mongourl,function(err,db){
		
		var query={"cuisine":null};
		(req.params.cuisine!="")?query["cuisine"]=req.params.cuisine:delete query["cuisine"];
		
		readRestaurantInformation(db,query,function(restaurantInformation){
			db.close();
			if(restaurantInformation.length!=0)
				res.json(restaurantInformation);
			else
				res.json({});
		})
	})
})

app.get("/rate",function(req,res){ //rate the restaurant
	if(!req.session.authentic)
		res.redirect("/login");
	mongoClient.connect(mongourl,function(err,db){
		getSingleRestaurant(db,req.query.index,function(restaurantInformation){
			//only rate the restaurant if the user has not rated it
			if(isRated(req.session.username,restaurantInformation["ratingArray"])){ 
				var message='<html><body><h1>Sorry! You have already rated</h1>';
				message+='<form action="/restaurantInformation" method="get">';
				message+='<input type="hidden" name="index" value="'+req.query.index+'">';
				message+='<input type="submit" value="Back To Restaurant Information"></form>';
				res.send(message);
			}
			else{ 
				var message='<html><body><h1>Edit Restaurant Information</h1>';
				message+='<form action="/rateconfirm" method="post">';
				message+='Rating(1-10):<input type="number" min="1" max="10" name="rate" required><br>';
				message+='<input type="hidden" name="index" value="'+req.query.index+'">';
				message+='<input type="submit" value="Submit"></form>';
				res.send(message);
			}
		})
	})
	
})

app.get("/restaurantInformation",function(req,res){ //render the restaurant based on the ejs object from the index
	if(!req.session.authentic)
		res.redirect("/login");
	mongoClient.connect(mongourl,function(err,db){
		getSingleRestaurant(db,req.query.index,function(restaurantInformation){
			console.log(restaurantInformation);
			db.close();
			ejsObj=getejs(restaurantInformation);
			console.log(ejsObj);
			res.render("restaurantdisplay.ejs",ejsObj);
		});
	});
})

app.get("/update",function(req,res){ //update the restaurant page
	if(!req.session.authentic)
		res.redirect("/login");
	mongoClient.connect(mongourl,function(err,db){

		getSingleRestaurant(db,req.query.index,function(restaurantInformation){
			//only the creater can update the restaurant
			if(req.session.username==restaurantInformation["creater"]){
				db.close();
				var message='<html><body><h1>Edit Restaurant Information</h1>';
				message+='<form action="/updateconfirm" method="post" enctype="multipart/form-data">';
				message+='Name:<input type="textfield" name="aname"><br>';
				message+='Cuisine:<input type="textfield" name="cuisine"><br><hr>';
				message+='Borough:<input type="textfield" name="borough"><br>';
				message+='Street:<input type="textfield" name="street"><br>';
				message+='Building:<input type="textfield" name="building"><br>';
				message+='Zipcode:<input type="textfield" name="code"><br><hr>';
				message+='GPS Coordinates(lon):<input type="textfield" name="lon"><br>';
				message+='GPS Coordinates(lat):<input type="textfield" name="lat"><br><hr>';
				message+='File:<input type="file" name="picture" accept="image/*"><br><br>';
				message+='<input type="hidden" name="index" value="'+req.query.index+'">'
				message+='<input type="submit" value="Submit"></form><br>';
				message+='<form action="/mainpage" method="get">';
				message+='<input type="submit" value="Back To Mainpage"></form><br>';
				res.send(message);
			}
			
			else{
				db.close();
				var message='<html><body><h1>Sorry! You have no authorized to update</h1>';
				message+='<form action="/restaurantInformation" method="get">';
				message+='<input type="hidden" name="index" value="'+req.query.index+'">';
				message+='<input type="submit" value="Back To Restaurant Information"></form>';
				res.send(message);
			}
		})
	})	
})

app.get("/logout",function(req,res){ //log out-clear the cookie  
	req.session=null;
	res.redirect("/login");
})

app.listen(process.env.PORT||8099);



