import secrets
import string

from flask import (jsonify, render_template,
                   request, url_for, flash, redirect)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.urls import url_parse
from werkzeug.utils import secure_filename
from sqlalchemy.sql import text
from flask_login import login_user, login_required, logout_user, current_user

from app import oauth
from app import app
from app import db
from app import login_manager
from PIL import Image

from app.models.image import Img
from app.models.blogentry import BlogEntry
from app.models.authuser import AuthUser, PrivateContact


@login_manager.user_loader
def load_user(user_id):
    # since the user_id is just the primary key of our
    # user table, use it in the query for the user
    return AuthUser.query.get(int(user_id))


@app.route('/')
def index():
    return render_template('base/index.html')


@app.route('/draw', methods=["POST","GET"])
def draw_page():
    if request.method == "POST":
        pic = request.files['pic']
        path = './static/img/user-blog/'
        
        if not pic:
            return 'No pic uploaded!', 400

        filename = secure_filename(pic.filename)
        mimetype = pic.mimetype
        if not filename or not mimetype:
            return 'Bad upload!', 400
        image = Image.open(pic)
        # Save the image in the specified path
        image.save(path + filename)
        
        return 'Img Uploaded!', 200
    return render_template('draw_page.html')


@app.route('/db')
def db_connection():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return '<h1>db works.</h1>'
    except Exception as e:
        return '<h1>db is broken.</h1>' + str(e)


@app.route('/upload', methods=["POST"])
def upload():
    pic = request.files['pic']
    if not pic:
        return 'No pic uploaded!', 400

    filename = secure_filename(pic.filename)
    mimetype = pic.mimetype
    if not filename or not mimetype:
        return 'Bad upload!', 400

    img = Img(img=pic.read(), name=filename, mimetype=mimetype)
    db.session.add(img)
    db.session.commit()

    return 'Img Uploaded!', 200

@app.route('/profile',methods=('GET', 'POST'))
@login_required
def profile():
    if request.method == 'POST':
        if(request.form['check_edit'] == 'edit_name'):
            current_password = request.form['password']
            new_name = request.form['name']
            new_email = request.form['email']
            
            user = AuthUser.query.filter_by(email=new_email).first()
            
            # Check if the current password is correct
            if not check_password_hash(current_user.password, current_password):
                flash('Incorrect password.')
            elif user and current_user.email != request.form['email']:
                flash('Email is already taken.')
            else:
                # Update the user's name and email
                old_name = current_user.name
                old_email = current_user.email
                current_user.name = new_name
                current_user.email = new_email
                db.session.commit()
                
                # Update all records in the database with the old name and email
                BlogEntry.query.filter_by(name=old_name, email=old_email).update({BlogEntry.name: new_name, BlogEntry.email: new_email})
                db.session.commit()
                flash('Your changes have been saved.')
                return redirect(url_for('profile'))
        elif(request.form['check_edit'] == 'edit_pass'):
            old_password = request.form.get("old_password")
            new_password = request.form.get("new_password")
            confirm_password = request.form.get("confirm_password")
            
            if not check_password_hash(current_user.password, old_password):
                flash("Incorrect password, Please try again")
                return redirect(url_for("lab13_profile"))

            if new_password != confirm_password:
                flash("Passwords do not match, Please try again")
                return redirect(url_for("profile"))

            
            current_user.password = generate_password_hash(new_password, method='sha256')
            
            db.session.commit()

            flash("Password updated successfully.")
    return render_template('base/profile.html')

@app.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        # login code goes here
        email = request.form.get('email')
        password = request.form.get('password')
        remember = bool(request.form.get('remember'))


        user = AuthUser.query.filter_by(email=email).first()
 
        # check if the user actually exists
        # take the user-supplied password, hash it, and compare it to the
        # hashed password in the database
        if not user or not check_password_hash(user.password, password):
            flash('Please check your login details and try again.')
            # if the user doesn't exist or password is wrong, reload the page
            return redirect(url_for('login'))


        # if the above check passes, then we know the user has the right
        # credentials
        login_user(user, remember=remember)
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
    return render_template('base/login.html')

@app.route('/signup', methods=('GET', 'POST'))
def signup():
    if request.method == 'POST':
        result = request.form.to_dict()
        app.logger.debug(str(result))
 
        validated = True
        validated_dict = {}
        valid_keys = ['email', 'name', 'password']


        # validate the input
        for key in result:
            app.logger.debug(str(key)+": " + str(result[key]))
            # screen of unrelated inputs
            if key not in valid_keys:
                continue


            value = result[key].strip()
            if not value or value == 'undefined':
                validated = False
                break
            validated_dict[key] = value
            # code to validate and add user to database goes here
        app.logger.debug("validation done")
        if validated:
            app.logger.debug('validated dict: ' + str(validated_dict))
            email = validated_dict['email']
            name = validated_dict['name']
            password = validated_dict['password']
            # if this returns a user, then the email already exists in database
            user = AuthUser.query.filter_by(email=email).first()


            if user:
                # if a user is found, we want to redirect back to signup
                # page so user can try again
                flash('Email address already exists')
                return redirect(url_for('signup'))


            # create a new user with the form data. Hash the password so
            # the plaintext version isn't saved.
            app.logger.debug("preparing to add")
            avatar_url = gen_avatar_url(email, name)
            new_user = AuthUser(email=email, name=name,
                                password=generate_password_hash(
                                    password, method='sha256'),
                                avatar_url=avatar_url)
            # add the new user to the database
            db.session.add(new_user)
            db.session.commit()


        return redirect(url_for('login'))
    return render_template('base/signup.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


def gen_avatar_url(email, name):
    bgcolor = generate_password_hash(email, method='sha256')[-6:]
    color = hex(int('0xffffff', 0) -
                int('0x'+bgcolor, 0)).replace('0x', '')
    lname = ''
    temp = name.split()
    fname = temp[0][0]
    if len(temp) > 1:
        lname = temp[1][0]


    avatar_url = "https://ui-avatars.com/api/?name=" + \
        fname + "+" + lname + "&background=" + \
        bgcolor + "&color=" + color
    return avatar_url

@app.route('/google/')
def google():


    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
        client_kwargs={
            'scope': 'openid email profile'
        }
    )


   # Redirect to google_auth function
    redirect_uri = url_for('google_auth', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)




@app.route('/google/auth/')
def google_auth():
    token = oauth.google.authorize_access_token()
    app.logger.debug(str(token))


    userinfo = token['userinfo']
    app.logger.debug(" Google User " + str(userinfo))
    email = userinfo['email']
    user = AuthUser.query.filter_by(email=email).first()


    if not user:
        name = userinfo['given_name'] + " " + userinfo['family_name']
        random_pass_len = 8
        password = ''.join(secrets.choice(string.ascii_uppercase + string.digits)
                          for i in range(random_pass_len))
        picture = userinfo['picture']
        new_user = AuthUser(email=email, name=name,
                           password=generate_password_hash(
                               password, method='sha256'),
                           avatar_url=picture)
        db.session.add(new_user)
        db.session.commit()
        user = AuthUser.query.filter_by(email=email).first()
    login_user(user)
    return redirect('/')