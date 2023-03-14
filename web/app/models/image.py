from app import db
from sqlalchemy_serializer import SerializerMixin

class Img(db.Model, SerializerMixin):
    __tablename__ = 'images'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False)
    mimetype = db.Column(db.Text, nullable=False)
    data = db.Column(db.LargeBinary, nullable=False)

    def __init__(self, name, mimetype, data):
        self.name = name
        self.mimetype = mimetype
        self.data = data

