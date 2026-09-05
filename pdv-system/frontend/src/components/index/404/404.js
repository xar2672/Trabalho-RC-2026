const REPEAT = 1000;

// Duration of Distance
const MAX = 350; //100
const MIN = 200; //1

// Centripetal or Angular Duration A.K.A. => Period
const MAXs = 2.5;
const MINs = 0.25;

//[SIN, COS]
const MAXES = {
    "Omor": [86, 80],
    "Romo": [83, 83],
    "DOOR": [93.15, 80],
    "door": [84.65, 65],
    "amongus": [95.5, 88]
}


async function SPIN(Item) {
    const RDM = Math.random() * (MAXs - MINs) + MINs;
    var speed = RDM * 100;

    !function loop() {
        Item.style["rotate"] = "";
        $(Item).animate({rotate: "1turn"}, 
        { duration: speed, easing: "linear", complete: loop });
    }();
}

function FINISHED(Query) {
    animate(Query);
}

function animate(Item) {
    console.log("OI");
    let ALL;
    if (Item !== undefined) {
        ALL = [Item];
    } else {
        ALL = document.querySelector("body div").childNodes;

        for (let i = 0; i < ALL.length; i++) {
            const OBJ = ALL[i];
            if (OBJ.attributes === undefined) {continue;}
            const MAXo = MAXES[OBJ.id];

            const RDMt = Math.random() * MAXo[0];
            const RDMl = Math.random() * MAXo[1];

            OBJ.style["left"] = (RDMl + "%");
            OBJ.style["top"] = (RDMt + "%");
        }
    }

    for (let i = 0; i < ALL.length; i++) {
        const RDM = Math.random() * (MAX - MIN) + MIN;
        var velocity = (100/RDM) * 1000;

        const SIN = Math.random();
        const COS = Math.sqrt(1 - (SIN ** 2));
        const TAN = SIN/COS;

        const QUERY = ALL[i];
        if (QUERY.attributes === undefined) {continue;}
        const ID = QUERY.id;
        
        const QUERYx = QUERY.style["left"] === "" ? 0: 
            parseFloat(QUERY.style["left"].slice(0, -1));
        const QUERYy = QUERY.style["top"] === "" ? 0: 
            parseFloat(QUERY.style["top"].slice(0, -1));

        
        let X, Y;
        
        /**
         * TG * X = Y  
         * X > LIMIT in Max_Y =: (MaxX, TG * MaxX) 
         * 
         * Y > LIMIt in Max_X =: (MaxY, MaxY / TG)
         * 
         * 
         * TG * X + Y(Atual) = Y
         * TG * X = Y - Y(Atual)
         * 
         * TG * X = Y
         * 
         */

        /**
         *   /|
         *  / |
         * /  |
         * ---
         */

        const MAXq = MAXES[ID];
        const MAXq1 = MAXq[0]; const MAXq2 = MAXq[1];

        if (QUERYx < 50) {
            if (TAN * MAXq1 > MAXq2) {
                Y = MAXq2;
                X = Y/TAN;
            } else {
                X = MAXq1;
                Y = X * TAN;
            }
        } else if (QUERYx >= 50 && QUERYx <= 100) {
            Y = MAXq2 - QUERYy;
            if (TAN * MAXq1 > Y) {
                X = Y/TAN;
                Y = Y * COS;
            } else {
                X = TAN * MAXq1;
                Y = MAXq2;
            }
        }
        
        SPIN(QUERY);
        $(QUERY).animate({
            left: (X + "%"),
            top: (Y + "%")
        }, {duration: (velocity), easing: "linear", queue: false, 
            done: function() {FINISHED(QUERY);}
        });
    }
}



window.onload = function() {animate()};

document.querySelector("#PORTA").addEventListener("mouseover", (event) => {
    event.target.src = "/www/Website/images/404/Door Opened.png";
});
document.querySelector("#PORTA").addEventListener("mouseout", (event) => {
    event.target.src = "/www/Website/images/404/Door.png";
});