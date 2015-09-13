CREATE TABLE Trips (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(255) NOT NULL,
);

CREATE TABLE Pictures (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(255) NOT NULL,
	hourlyRate DECIMAL(5,2),
	tripId INT,
);
ALTER TABLE Pictures ADD CONSTRAINT PicturesTakenOnTrips
FOREIGN KEY (tripId) REFERENCES Trips (id);

CREATE TABLE Locations (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	text varchar(255) NOT NULL,
	latitude DECIMAL(3,6),
	longitude DECIMAL(3,6),
	pictureId INT
);
ALTER TABLE Locations ADD CONSTRAINT PicturesTakenAtLocations
FOREIGN KEY (pictureId) REFERENCES Pictures (id);
