"""Pydantic schema for free-body diagram extraction."""
from pydantic import BaseModel
from .shared import AuditBlock


class Force(BaseModel):
    label: str
    magnitude: float
    angle: float        # degrees; 0 = right, 90 = up
    anchor: str = "center"


class FreeBodyDiagram(BaseModel):
    mass: float
    forces: list[Force]
    surface: str = ""
    friction_coeff: float = 0.0
    audit: AuditBlock

    # TODO: add validators (e.g. forces non-empty)
