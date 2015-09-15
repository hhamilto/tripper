CREATE TABLE Trips (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(255) NOT NULL
);

CREATE TABLE Pictures (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	url varchar(255) NOT NULL,
	locationText varchar(255),
	latitude DECIMAL(9,6),
	longitude DECIMAL(9,6),
	tripId INT
);
ALTER TABLE Pictures ADD CONSTRAINT PicturesTakenOnTrips
FOREIGN KEY (tripId) REFERENCES Trips (id);