#! /bin/bash
IMAGE_LOCATION=public/pics
CWD=$(pwd)
cd $IMAGE_LOCATION
ls | grep -vi 'jpg$' | xargs rm -r #if it aint a jpeg nix it
ls  | grep -E '\(' | xargs rm -r #if it dup nix it
exiftran -ai * #rotate funny stuff right side up
#hide pimples by scaling images down
for IMAGE_FILE in $( ls ); do
	convert $IMAGE_FILE -resize '400x400' $IMAGE_FILE
done
cd $CWD
echo '{}' > picData.json
