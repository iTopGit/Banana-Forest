from app import db
from sqlalchemy_serializer import SerializerMixin
import datetime

class BlogEntry(db.Model, SerializerMixin):
    __tablename__ = "blogentry"

    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(280))
    img_id = db.Column(db.String(50))
    like = db.Column(db.JSON, nullable=True)
    date_created = db.Column(db.DateTime)
    date_updated = db.Column(db.DateTime)
    
    def __init__(self, message, img_id, like=None):
        self.message = message
        self.img_id = img_id
        self.like = like or []
        self.date_created = datetime.datetime.now()
        self.date_updated = datetime.datetime.now()

    def update(self, message, img_id):
        self.message = message
        self.img_id = img_id
        self.date_updated = datetime.datetime.now()
        
    def like_update(self, like):
        self.like += like
        
    def like_remove(self, item):
        self.like.remove(item)
