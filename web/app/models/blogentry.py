from app import db
from sqlalchemy_serializer import SerializerMixin
import datetime

class BlogEntry(db.Model, SerializerMixin):
    __tablename__ = "blogentry"

    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(280))
    img_id = db.Column(db.String(50))
    date_created = db.Column(db.DateTime)
    date_updated = db.Column(db.DateTime)
    
    def __init__(self, email, img_id):
        self.email = email
        self.img_id = img_id
        self.date_created = datetime.datetime.now()
        self.date_updated = datetime.datetime.now()

    def update(self, message, img_id):
        self.message = message
        self.img_id = img_id
        self.date_updated = datetime.datetime.now()
