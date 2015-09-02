#! /bin/bash
IMAGE_LOCATION=public/pics
ls $IMAGE_LOCATION | grep -vi jpg | xargs rm #if it aint a jpeg nix it
exiftran -ai $IMAGE_LOCATION/* #rotate funny stuff right side up
#hide pimples by scaling images down
for IMAGE_FILE in $( ls $IMAGE_LOCATION ); do
	convert $IMAGE_LOCATION/$IMAGE_FILE -resize '400x400' $IMAGE_LOCATION/$IMAGE_FILE
done