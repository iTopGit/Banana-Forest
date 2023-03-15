import secrets
import string
import base64
import datetime

from flask import (jsonify, render_template,send_file,
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
from io import BytesIO

from app.models.image import Img
from app.models.blogentry import BlogEntry
from app.models.authuser import AuthUser, PrivateContact


@login_manager.user_loader
def load_user(user_id):
    # since the user_id is just the primary key of our
    # user table, use it in the query for the user
    return AuthUser.query.get(int(user_id))

@app.route('/', methods=('GET', 'POST'))
def index():
    if request.method == 'POST':
        result = request.form.to_dict()
        app.logger.debug(str(result))
        id_ = result.get('id', '')
        validated = True
        validated_dict = dict()
        validated_dict['img_id'] = -1
        validated_dict['name'] = current_user.name
        validated_dict['email'] = current_user.email
        validated_dict['avatar_url'] = current_user.avatar_url

        valid_keys = ['message']

        # validate the input
        for key in result:
            app.logger.debug(key, result[key])
            # screen of unrelated inputs
            if key not in valid_keys:
                continue

            value = result[key].strip()
            if not value or value == 'undefined':
                validated = False
                break
            validated_dict[key] = value

        if validated:
            app.logger.debug('validated dict: ' + str(validated_dict))
            # if there is no id_: create blogEntry
            if not id_:
                validated_dict['owner_id'] = current_user.id
                # entry = BlogEntry(**validated_dict)
                entry = PrivateContact(**validated_dict)
                app.logger.debug(str(entry))
                db.session.add(entry)
            # if there is an id_ already: update blogEntry
            else:
                # blogEntry = BlogEntry.query.get(id_)
                blogEntry = PrivateContact.query.get(id_)
                if blogEntry.owner_id == current_user.id:
                    blogEntry.update(**validated_dict)

            db.session.commit()

        return db_post()
    return render_template('base/index.html')

@app.route("/post")
def db_post():
    post = []
    db_post = BlogEntry.query.all()

    post = list(map(lambda x: x.to_dict(), db_post))
    post.sort(key=lambda x:x['id'])
    app.logger.debug("DB Content: " + str(post))

    return jsonify(post)

@app.route('/remove_post', methods=('GET', 'POST'))
def remove_post():
    app.logger.debug("REMOVE")
    if request.method == 'POST':
        result = request.form.to_dict()
        id_ = result.get('id', '')
        try:
            post = PrivateContact.query.get(id_)
            if post.owner_id == current_user.id:
                db.session.delete(post)
            db.session.commit()
        except Exception as ex:
            app.logger.debug(ex)
            raise
    return db_post()

@app.route('/test')
def test():
    return render_template('img_test.html')

@app.route('/draw', methods=["POST", "GET"])
@login_required
def draw_page():
    if request.method == "POST":
        result = request.form.to_dict()
        app.logger.debug(str(result))
        path = './app/static/img/user-blog/'

        data_url = request.form['pic']

        # Split the data URL to get the MIME type and base64-encoded data
        mime_type,base64_data = data_url.split(",", 1)#[1]
        # mime_type = data_url.split(';')[0].split(':')[1]
        app.logger.debug(str("mime_type : "+ mime_type))
        
        # Decode the base64 data
        binary_data = base64.b64decode(base64_data)
        hash_name = current_user.email + current_user.name + str(datetime.datetime.now())
        filename = generate_password_hash(hash_name, method='sha256')+ ".png"

        # Write the binary data to a file
        # with open(path + filename, "wb") as f:
            # f.write(binary_data)

        img = Img(name=filename, mimetype=mime_type, data=binary_data)

        db.session.add(img)
        db.session.commit()

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
    pic = request.files['pic']['data']
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


@app.route('/profile', methods=('GET', 'POST'))
@login_required
def profile():
    if request.method == 'POST':
        if (request.form['check_edit'] == 'edit_name'):
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
                BlogEntry.query.filter_by(name=old_name, email=old_email).update(
                    {BlogEntry.name: new_name, BlogEntry.email: new_email})
                db.session.commit()
                flash('Your changes have been saved.')
                return redirect(url_for('profile'))
        elif (request.form['check_edit'] == 'edit_pass'):
            old_password = request.form.get("old_password")
            new_password = request.form.get("new_password")
            confirm_password = request.form.get("confirm_password")

            if not check_password_hash(current_user.password, old_password):
                flash("Incorrect password, Please try again")
                return redirect(url_for("lab13_profile"))

            if new_password != confirm_password:
                flash("Passwords do not match, Please try again")
                return redirect(url_for("profile"))

            current_user.password = generate_password_hash(
                new_password, method='sha256')

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


@app.route('/facebook/')
def facebook():
    oauth.register(
        name='facebook',
        client_id=app.config['FACEBOOK_CLIENT_ID'],
        client_secret=app.config['FACEBOOK_CLIENT_SECRET'],
        access_token_url='https://graph.facebook.com/oauth/access_token',
        access_token_params=None,
        authorize_url='https://www.facebook.com/dialog/oauth',
        authorize_params=None,
        api_base_url='https://graph.facebook.com/',
        client_kwargs={'scope': 'email'},
    )
    redirect_uri = url_for('facebook_auth', _external=True)
    return oauth.facebook.authorize_redirect(redirect_uri)


@app.route('/facebook/auth/')
def facebook_auth():
    token = oauth.facebook.authorize_access_token()
    app.logger.debug(token)
    resp = oauth.facebook.get(
        'https://graph.facebook.com/me?fields=id,name,email,picture{url}')
    profile = resp.json()
    email = profile['email']

    user = AuthUser.query.filter_by(email=email).first()
    if not user:
        name = profile['name']
        random_pass_len = 8
        password = ''.join(secrets.choice(string.ascii_uppercase + string.digits)
                           for i in range(random_pass_len))
        picture = profile['picture']['data']['url']
        new_user = AuthUser(email=email, name=name,
                            password=generate_password_hash(
                                password, method='sha256'),
                            avatar_url=picture)
        db.session.add(new_user)
        db.session.commit()
        user = AuthUser.query.filter_by(email=email).first()
    login_user(user)
    return redirect('/')

#image_api_call
# @app.route('/image/<filename>')
# def get_image(filename):
#     return app.send_static_file(f'static/img/user-blog{filename}', mimetype='image/png')

@app.route('/image/<int:image_id>')
def get_image(image_id):
    # query database for image
    img = Img.query.get(image_id)
    if img:
        # create a response with the image data and mimetype
        return send_file(BytesIO(img.data), mimetype=img.mimetype)
    else:
        # image not found
        return "Image not found", 404

@app.route("/db/blogEntry")
@login_required
def db_BlogEntry():
    blogEntry = []
    db_blogEntry = BlogEntry.query.all()

    blogEntry = list(map(lambda x: x.to_dict(), db_blogEntry))
    blogEntry.sort(key=lambda x: x['id'])
    app.logger.debug("DB blogEntry: " + str(blogEntry))

    return jsonify(blogEntry)

@app.route("/db/authuser")
@login_required
def db_authuser():
    authuser = []
    db_authuser = AuthUser.query.filter()

    # authuser = list(map(lambda x: x.to_dict(), db_authuser))
    authuser.sort(key=lambda x: x['id'])
    app.logger.debug("DB AuthUser: " + str(authuser))

    return jsonify(authuser)

@app.route("/db/image")
@login_required
def db_image():
    Image = []
    db_Image = Img.query.all()
    # db_Image = Img.query.filter()
    app.logger.debug("DB Image: " + str(db_Image))

    # Image = list(map(lambda x: x.to_dict(), db_Image))
    Image.sort(key=lambda x: x['id'])
    app.logger.debug("DB image: " + str(Image))

    return jsonify(Image)