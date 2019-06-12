#!/bin/bash

DBVTK="dbvtk-2.0.0.war"
BINTRAY="https://dl.bintray.com/keeps/db-visualization-toolkit/${DBVTK}"
DBVTK_TARGET="./resources/war/dbvtk.war"

#download dbvtk package from bintray
if [ ! -f $DBVTK_TARGET ]; then
    mkdir -p "./resources/war"
    curl -L $BINTRAY -o $DBVTK_TARGET
fi
