"""Pydantic schema for free-body diagram extraction."""
from pydantic import BaseModel, field_validator
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

    @field_validator("mass")
    @classmethod
    def mass_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("mass must be positive")
        return v

    @field_validator("forces")
    @classmethod
    def forces_must_be_non_empty(cls, v: list[Force]) -> list[Force]:
        if not v:
            raise ValueError("at least one force is required")
        return v

    @field_validator("friction_coeff")
    @classmethod
    def friction_must_be_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("friction_coeff must be >= 0")
        return v
