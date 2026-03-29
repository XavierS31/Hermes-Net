import mesa
import math

class HurricaneAgent(mesa.Agent):
    def __init__(self, model):
        super().__init__(model)
        self.path_index = 0
        self.path = model.hurricane_path
        self.lat = self.path[0]["lat"]
        self.lng = self.path[0]["lng"]
        self.wind_speed = 120
        self.surge_radius_miles = 30
        self.category = 4

    def distance_to_tampa(self):
        tampa_lat, tampa_lng = 27.9506, -82.4572
        return math.sqrt(
            (self.lat - tampa_lat) ** 2 +
            (self.lng - tampa_lng) ** 2
        ) * 69

    def step(self):
        if self.path_index < len(self.path) - 1:
            self.path_index += 1
            self.lat = self.path[self.path_index]["lat"]
            self.lng = self.path[self.path_index]["lng"]
            self.wind_speed = min(160, self.wind_speed + 2)