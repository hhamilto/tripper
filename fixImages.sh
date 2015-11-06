#! /bin/bash
shopt -s nocasematch
while read -r imagefile ; do
	if [[ $imagefile != *.jpg ]] ; then  #if it aint a jpeg nix it
		rm $imagefile
		continue
	fi
	if [[ $imagefile == *\(* ]] ; then  #if it dup nix it (it has parentheses (() or ()) in the file name)
		rm $imagefile
		continue
	fi
	exiftran -ai $imagefile
	convert $imagefile -resize '400x400' 400_$imagefile
done