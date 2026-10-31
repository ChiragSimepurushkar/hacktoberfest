"""Pydantic schema for circuit diagram extraction."""
from typing import Literal
from pydantic import BaseModel
from .shared import AuditBlock


class Component(BaseModel):
    type: Literal["battery", "resistor", "capacitor", "inductor", "switch", "led", "ground"]
    value: float = 0.0
    node_a: str
    node_b: str
    label: str = ""


class Circuit(BaseModel):
    components: list[Component]
    source: str          # label of the voltage/current source
    audit: AuditBlock

    # TODO: add validators (e.g. at least one source component)
