# backend/simulation/geography.py

BRIDGES = {
    "gandy": {
        "name": "Gandy Bridge",
        "lat": 27.9089,
        "lng": -82.5618,
        "capacity": 100,
        "route": "I-275 North"
    },
    "howard_frankland": {
        "name": "Howard Frankland Bridge",
        "lat": 27.9342,
        "lng": -82.5960,
        "capacity": 100,
        "route": "SR-60 East"
    },
    "sunshine_skyway": {
        "name": "Sunshine Skyway Bridge",
        "lat": 27.6203,
        "lng": -82.6548,
        "capacity": 80,
        "route": "US-19 North"
    }
}

SHELTERS = {
    "north": {
        "name": "Zone North Shelter",
        "lat": 28.3512,
        "lng": -82.6862,
        "capacity": 200,
        "requires_car": False,
        "distance_miles": 50
    },
    "northeast": {
        "name": "Zone NE Shelter",
        "lat": 28.1012,
        "lng": -82.1543,
        "capacity": 150,
        "requires_car": True,
        "distance_miles": 40
    },
    "east": {
        "name": "Zone East Shelter",
        "lat": 27.9512,
        "lng": -81.9123,
        "capacity": 300,
        "requires_car": False,
        "distance_miles": 35
    }
}

ZONES = {
    "A": {"description": "Coastal - highest risk", "priority": 1},
    "B": {"description": "Near coastal",           "priority": 2},
    "C": {"description": "Moderate risk",          "priority": 3},
    "D": {"description": "Lower risk",             "priority": 4},
    "E": {"description": "Inland - lowest risk",   "priority": 5}
}

# All hurricane approach paths — each converges on Tampa Bay (27.95, -82.46)
HURRICANE_PATHS = {
    "south": [
        {"lat": 24.5, "lng": -80.2},
        {"lat": 25.4, "lng": -81.0},
        {"lat": 26.2, "lng": -81.8},
        {"lat": 26.9, "lng": -82.3},
        {"lat": 27.4, "lng": -82.5},
        {"lat": 27.9, "lng": -82.6},
    ],
    "southeast": [
        {"lat": 25.0, "lng": -79.5},
        {"lat": 25.8, "lng": -80.4},
        {"lat": 26.5, "lng": -81.1},
        {"lat": 27.0, "lng": -81.7},
        {"lat": 27.5, "lng": -82.1},
        {"lat": 27.9, "lng": -82.5},
    ],
    "east": [
        {"lat": 27.9, "lng": -79.8},
        {"lat": 27.9, "lng": -80.6},
        {"lat": 27.9, "lng": -81.2},
        {"lat": 27.9, "lng": -81.7},
        {"lat": 27.9, "lng": -82.1},
        {"lat": 27.9, "lng": -82.5},
    ],
    "northeast": [
        {"lat": 30.0, "lng": -79.8},
        {"lat": 29.4, "lng": -80.5},
        {"lat": 28.9, "lng": -81.2},
        {"lat": 28.5, "lng": -81.8},
        {"lat": 28.1, "lng": -82.2},
        {"lat": 27.9, "lng": -82.5},
    ],
    "north": [
        {"lat": 30.8, "lng": -82.5},
        {"lat": 30.2, "lng": -82.5},
        {"lat": 29.5, "lng": -82.5},
        {"lat": 28.8, "lng": -82.5},
        {"lat": 28.2, "lng": -82.5},
        {"lat": 27.9, "lng": -82.5},
    ],
    "northwest": [
        {"lat": 30.5, "lng": -85.5},
        {"lat": 30.0, "lng": -84.5},
        {"lat": 29.4, "lng": -83.7},
        {"lat": 28.8, "lng": -83.1},
        {"lat": 28.2, "lng": -82.7},
        {"lat": 27.9, "lng": -82.5},
    ],
    "west": [
        {"lat": 27.9, "lng": -87.5},
        {"lat": 27.9, "lng": -86.0},
        {"lat": 27.9, "lng": -84.5},
        {"lat": 27.9, "lng": -83.5},
        {"lat": 27.9, "lng": -82.9},
        {"lat": 27.9, "lng": -82.5},
    ],
    "southwest": [
        {"lat": 24.8, "lng": -85.5},
        {"lat": 25.5, "lng": -84.5},
        {"lat": 26.3, "lng": -83.8},
        {"lat": 26.9, "lng": -83.2},
        {"lat": 27.4, "lng": -82.8},
        {"lat": 27.9, "lng": -82.5},
    ],
}

# Default path (backward compat)
HURRICANE_PATH = HURRICANE_PATHS["south"]
