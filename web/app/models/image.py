from app import db
from sqlalchemy_serializer import SerializerMixin

class Img(db.Model,SerializerMixin):
    __tablename__ = 'images'
    id = db.Column(db.Integer, primary_key=True)
    img = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text, nullable=False)
    mimetype = db.Column(db.Text, nullable=False)
    
    def __init__(self, img, name, mimetype):
        self.img = img
        self.name = name
        self.mimetype = mimetype
