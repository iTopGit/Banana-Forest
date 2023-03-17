from flask.cli import FlaskGroup
from werkzeug.security import generate_password_hash
import datetime
from app import app, db
from app.models.blogentry import BlogEntry
from app.models.authuser import AuthUser, PosonalPost

cli = FlaskGroup(app)


@cli.command("create_db")
def create_db():
    db.drop_all()
    db.create_all()
    db.session.commit()


@cli.command("seed_db")
def seed_db():
    db.session.add(AuthUser(email="capybara@mail.com", name='capybara',
        password=generate_password_hash('1234', method='sha256'),
        avatar_url='../static/img/capi.jpg'))
    db.session.commit()
    db.session.add(
        PosonalPost(owner_id=1,message='musu', img_id='-1')
    )
    db.session.commit()
    db.session.add(AuthUser(email="cap@suit", name='suit',
        password=generate_password_hash('1234', method='sha256'),
        avatar_url='../static/img/capybara_suit.jpg'))
    db.session.commit()
    db.session.add(
        PosonalPost(owner_id=2,message='capybara', img_id='-1')
    )
    db.session.commit()


if __name__ == "__main__":
    cli()
